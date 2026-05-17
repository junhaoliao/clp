# CLPP (CLP++) Fork — Design & WebUI Integration Investigation

## Context

This document covers what the fork adds, worked examples, market research, and feature design with real data mapping. It analyzes the `davidlion/clp` fork (branch `clpp`) against its common ancestor with `y-scope/clp` (commit `01448089`) to understand the fork adds and inform feature design.

---

---

## 1. What the Fork Adds


All new features are gated behind an `--experimental` CLI flag on the `clp-s` binary. When the flag is off, behavior is identical to upstream.

### 1.1 New `clpp` C++ Library (`components/core/src/clpp/`)

10 new files forming a standalone library `clpp_core`:

| File | Purpose |
|------|---------|
| `Array.hpp` | Generic Zstd-serializable array template, parameterized by element type and index type. Used as the container for logtype stats and metadata arrays stored in archives. |
| `DecomposedQuery.hpp/.cpp` | Core query decomposition engine. Takes a CLP wildcard query string and a log-surgeon parser, uses `log_surgeon::ParserHandle::query_interpretations()` to decompose the query into multiple `Interpretation` objects, each containing `m_static_text` (literal portion with `%qualified_name%` placeholders) and `m_leaf_queries` (variable-column filters). Also provides `create_parent_match_dicts()` and `split_qualified_name()`. |
| `LogTypeMetadata.hpp/.cpp` | Per-logtype parent-match metadata. Each entry holds a vector of `ParentMatchView` structs (`m_name`, `m_start`, `m_size`) recording where parent-rule captures appear within a logtype string. Enables searching sub-portions of logtypes. Zstd-serializable. |
| `LogTypeStat.hpp/.cpp` | Per-logtype occurrence count statistics. Just a `m_count` field for now. Zstd-serializable. |
| `ErrorCode.hpp/.cpp` | Error code enum: `Success`, `BadParam`, `Corrupt`, `MetadataCorrupted`, `FailureMetadataCorrupted`, `DecomposeQueryFailure`, `Unsupported`. |

### 1.2 New Schema Tree Node Types

Added to `components/core/src/clp_s/SchemaTree.hpp`:

- **`NodeType::LogMessage` (value 100)** — Container node representing a structured decomposition of an unstructured log message. Contains a `LogType` child, a `LogTypeID` child, and variable children (`CompositeVar`/primitives).
- **`NodeType::LogType`** — Like `ClpString` but without a variable dictionary component; only a logtype dictionary. Variables are stored in their own schema nodes.
- **`NodeType::LogTypeID`** — Leaf node whose key name is the stringified logtype dictionary ID, linking the schema entry to its logtype in the typed dictionary.
- **`NodeType::ParentRule`** — Represents a non-leaf capture group from log-surgeon parsing, enabling hierarchical structured fields within a log message (e.g., a timestamp that contains sub-fields).

All new types map to a new `LiteralType::ClppDecomposeT` in the search AST.

### 1.3 Compression Path Changes

When `--experimental` is enabled and `--schema-path` points to a log-surgeon schema:

**JsonParser** (`components/core/src/clp_s/JsonParser.cpp`):
- Strings containing spaces are parsed as **LogMessage** nodes instead of `ClpString`.
- New `parse_log_message()` method (~150 lines):
  1. Feeds raw text to `log_surgeon::ParserHandle::next_event()`.
  2. Iterates leaf matches, classifying each as integer or string using hardcoded heuristic sets (`cIntSet`/`cFloatSet` with Hadoop, Hive, MongoDB, OpenStack rule names).
  3. Creates schema tree nodes under the `LogMessage` node with `ParentRule` intermediaries for nested rules.
  4. Builds a logtype string by replacing variables with `%fully_qualified_name%` placeholders.
  5. Stores the logtype in the typed log dictionary via `update_logtype_dict()`.
  6. Stores parent-match metadata via `update_logtype_metadata()` for new logtypes.

**ArchiveWriter** (`components/core/src/clp_s/ArchiveWriter.cpp`):
- Log dictionary replaced with a **typed variable dictionary** (`m_typed_log_dict` as `VariableDictionaryWriter` instead of `LogTypeDictionaryWriter`).
- New `m_logtype_stats` (`LogTypeStatArray`) and `m_logtype_metadata` (`LogTypeMetadataArray`).
- Three new archive sections written on close:
  - `/logtype_metadata` — compressed `LogTypeMetadataArray`
  - `/logtype_stats` — compressed `LogTypeStatArray`
  - `/ls_schema` — compressed log-surgeon schema text (for search-time use)

### 1.4 Decompression / Archive Reading Changes

**ArchiveReader** (`components/core/src/clp_s/ArchiveReader.cpp`):
- New `Options` struct with `bool experimental` flag (replaces bare `NetworkAuthOption`).
- `read_logtype_metadata()`, `read_logtype_stats()`, `read_log_surgeon_schema()` — read the three new archive sections.
- All eagerly loaded in `initialize_archive_reader()` when experimental mode is on.
- New `m_typed_log_dict` (`VariableDictionaryReader`) replaces `m_log_dict`.

**SchemaReader** (`components/core/src/clp_s/SchemaReader.cpp`):
- New `generate_log_message_template()` — generates JSON serialization ops for `LogMessage` nodes. For `LogTypeID` nodes, looks up the logtype string from the typed dictionary and emits it as a constant string field (`"log_type": <value>`).
- `set_typed_log_dict()` method to inject the typed dictionary reader.

**JsonSerializer** (`components/core/src/clp_s/JsonSerializer.hpp`):
- New `Op::AddConstantStringField` operation.
- `add_constant_string_field(key, value)` and `append_constant_string_field()` methods.
- New `m_constant_strings` vector for storing constant logtype values.

### 1.5 Search Path Changes (Largest Change Area)

**SchemaMatch** (`components/core/src/clp_s/search/SchemaMatch.cpp`, +369 lines):
- Constructor now takes `shared_ptr<ArchiveReader>` instead of separate tree + schema map.
- When search hits a `LogMessage` or `ParentRule` node, `resolve_clpp_query()` is invoked:
  1. `build_logtype_id_to_schema_id_map()` — builds reverse map from logtype IDs to schema IDs.
  2. For **EXISTS** queries: registers the column for all schemas containing a logtype under the qualified path.
  3. For **equality/wildcard** queries: `lookup_decomposed_query()` decomposes the query via log-surgeon, then for each interpretation:
     - `find_schemas_matching_predicate()` matches the interpretation's `m_static_text` against logtypes in the typed dictionary.
     - `build_leaf_query_expr()` creates `AndExpr` leaf equality filters for variable columns.
  4. Returns an `OrExpr` over all matching interpretations.
- `lookup_decomposed_query()` — lazily initializes the log-surgeon parser from stored schema; caches decompositions keyed by `(qualified_name, query)`.
- `m_clpp_decomposed_query` flag — set when any CLPP decomposition occurs, triggers re-standardization of the expression.

**QueryRunner** (`components/core/src/clp_s/search/QueryRunner.cpp`, +132 lines):
- `populate_string_queries()` for `ClpStringT` is effectively **disabled** (early return) — the old GrepCore/SchemaSearcher search path is commented out. Search now goes through the CLPP decomposition path.
- New `evaluate_numeric_wildcard_filter<T>()` — converts numeric values to strings (`fmt::format("{:.17g}")` for doubles) and applies wildcard matching. Enables wildcard queries like `"abc*"` to match against integer/float columns.
- Static counters: `m_int_col_checks`, `m_float_col_checks`, `m_str_col_checks` for search metrics.

**Search AST** (`components/core/src/clp_s/search/ast/`):
- `LiteralType::ClppDecomposeT = 1 << 8` added.
- `StringLiteral` now always sets both `ClpStringT | VarStringT` type bits (space-based heuristic removed).
- `NarrowTypes` no longer removes `IntegerT`/`FloatT` for wildcard strings — enables the numeric wildcard fallback.
- New virtual `has_wildcards()` on `Literal` base class.

### 1.6 Special Query: `stats.logtypes`

`CommandLineArguments::cLogTypeStatsQuery = "stats.logtypes"` — when this string is used as the query with `--experimental`, the `handle_experimental_queries()` function in `clp-s.cpp` outputs per-logtype statistics as JSONL:

```json
{"id":0,"count":150,"log_type":"Starting %message.service% on port %message.port%"}
{"id":1,"count":87,"log_type":"Connection from %message.host% failed: %message.error%"}
```

This is a CLI-only feature currently — there is no API endpoint or WebUI access to this data.

### 1.7 Search Metrics

Added static counters tracked during search execution:
- `GrepCore::m_total_messages_searched` — incremented on every `filter()` call.
- `QueryRunner::m_int_col_checks`, `m_float_col_checks`, `m_str_col_checks` — column-type-specific check counts.
- `GrepCore::m_dict_id_checks`, `m_wildcard_checks`, `m_time_range_checks` — internal search phase counters.
- Logged at program exit via `spdlog`.

---

---

## 2. What Has NOT Changed


These components have **zero diffs** from upstream:

- `components/api-server/` — No new API endpoints in the upstream fork. (The WebUI now has its own schema and compression endpoints — see section 8.3.)
- `components/job-orchestration/` — No query orchestration changes.
- `components/package-template/` — No packaging template changes.
- `components/clp-package-utils/` — No utility changes.
- `components/log-ingestor/` — No ingestion changes.
- `components/clp-mcp-server/` — No MCP server changes.

This means: **all new CLPP capabilities exist only at the C++ CLI level. The WebUI integration for CLPP (schema content editor, saved schema selector, compression form with `schemaContent`) is built on top of the existing `components/webui/` — see sections 8.3–8.4 for the updated architecture.**

---

---

## 3. Worked Examples: Schema, Logs, and Queries


This section walks through how CLPP works end-to-end with a real log-surgeon schema, sample log messages, and example queries.

### 3.1 The Log-Surgeon Schema File

A log-surgeon schema defines **delimiters** and **rules** for parsing unstructured text. The default schema at `components/core/config/schemas.txt` is:

```
// Delimiters
delimiters: \t\r\n!"#$%&'()*,:;<>?@[]^_`{}|~

// Timestamp headers
header:(?<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3}){0,1})
header:(?<timestamp>\[\d{8}-\d{2}:\d{2}:\d{2}\])

// Specially-encoded variables
int:-?\d+
float:-?\d+\.\d+

// Dictionary variables
hex:[a-fA-F]+
hasNumber:.*\d.*
equals:.*=.*[a-zA-Z0-9].*
```

**How to read this:**
- `delimiters:` — characters that split the text into tokens. Everything between delimiters is a "token" that gets matched against the rules below.
- `header:` — rules applied at the start of a line. Named captures like `(?<timestamp>...)` create structured fields.
- `int:` and `float:` — **keyword rules** that are specially encoded (integers/floats get their own column type in the archive).
- `hex:`, `hasNumber:`, `equals:` — **dictionary variables** (custom named patterns). Any `typeName:regexPattern` pair creates a named capture group.

**For CLPP**, the critical thing is the **rule names**. When log-surgeon parses a message, each captured token gets a rule name (e.g., `timestamp`, `int`, `blk_id`, `port`). The `cIntSet` and `cFloatSet` in `JsonParser.cpp` map these rule names to CLPP column types:

| Rule name | CLPP column type | Why |
|-----------|------------------|-----|
| `int`, `blk_id`, `port`, `containerSeq`, ... | `NodeType::Integer` | In `cIntSet` + value is a representable integer |
| `float`, `byteValue` | (planned: `NodeType::Float`) | In `cFloatSet` (currently not handled — TODO) |
| Everything else | `NodeType::VarString` | Falls through to string storage |

### 3.2 A Hive-Specific Schema (for Hadoop/YARN/HDFS logs)

The fork was developed and tested against the Hive 24hr dataset from Zenodo. A schema tailored for Hadoop ecosystem logs would define specific rule names that match the `cIntSet` entries:

```
delimiters: \t\r\n!"#$%&'()*,:;<>?@[]^_`{}|~

// Timestamp
header:(?<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})

// Core types
int:-?\d+
float:-?\d+\.\d+

// Hadoop/Hive-specific named captures (these names must match cIntSet entries)
blk_id:blk_\d+_\d+
containerSeq:container_\d+_\d+_\d+_\d+
portNum:\d{1,5}
memory:-?\d+
vcores:-?\d+
pid:\d+
blockID:blk_-?\d+_\d+
exitStatus:\d+
```

This ensures that when log-surgeon encounters `blk_1073746642_1770` in a log message, it captures it with the rule name `blk_id`, which CLPP recognizes as an integer type.

### 3.3 How Schema Tree Key Names Work (and the Deduplication Trap)

This is a critical design detail that affects search precision.

**Key names come from log-surgeon rule names.** When `parse_log_message()` creates a schema tree node, the key is set to the log-surgeon match's `rule_name` (JsonParser.cpp:1615):

```cpp
m_archive_writer->add_node(
    parent_node_id,
    NodeType::Integer,
    match->ffi_pointers.rule_name.as_cpp_view()  // ← this IS the key name
);
```

So with the default schema where `int:-?\d+` is the only integer rule, every integer match gets key name `"int"`. With a Hive-specific schema that has `blk_id:blk_\d+_\d+`, a match on `blk_1073742594_1770` gets key name `"blk_id"`.

**Schema tree nodes are deduplicated by the triple `(parent_id, key_name, type)`.** Look at `SchemaTree::add_node()` (SchemaTree.cpp:48-54):

```cpp
auto node_it = m_node_map.find({parent_node_id, key, type});
if (node_it != m_node_map.end()) {
    auto node_id = node_it->second;
    m_nodes[node_id].increase_count();  // ← reuses the SAME node
    return node_id;
}
```

Two `Integer` children with key `"int"` under the same `LogMessage` parent → **same schema tree node**, returned with an incremented count. Two children with keys `"memory"` and `"vcores"` → **different** schema tree nodes.

**BUT** the per-record **Schema** (the column list for a specific log record type) allows repeated node IDs in its unordered region. So if a message has 5 integer variables all with key `"int"`, the schema contains the same `Integer("int")` node ID 5 times — once per variable occurrence.

**Search implication:** A query like `message.int: -300064699` matches if **any** of the 5 integer positions equals `-300064699`. You cannot distinguish which positional occurrence matched. With unique rule names (e.g., `message.memory`, `message.vcores`), each variable gets its own column and can be searched independently.

**Schema path is required for CLPP.** The `--experimental` flag alone doesn't work — `--schema-path` must also be provided. If `--experimental` is on but no schema path is given, `m_log_surgeon_parser` stays null and `parse_log_message()` will crash on dereference. There's no validation that prevents this (the `validate_experimental()` function only checks the reverse: that `--schema-path` isn't used without `--experimental`). This is likely a bug or an incomplete implementation. **In the WebUI**, this complexity is abstracted away: the frontend sends `schemaContent: string | null`, and when `schema_content` is present in `ClpIoConfig`, the Python worker automatically writes it to a temp file and passes both `--experimental` and `--schema-path <temp>` to `clp-s`.

### 3.4 Sample Log Messages and Their CLPP Decomposition

Consider these Hadoop log messages (from the test data at `components/core/tests/test_network_reader_src/random.log`):

**Message A:**
```
2024-02-11 13:36:33.461 org.apache.hadoop.mapred.MapTask: (RESET) equator -300064699 kv -300064699(-300064699) kvi -300064699(-300064699)
```

**Message B:**
```
2024-02-11 13:36:33.521 org.apache.hadoop.yarn.server.nodemanager.containermanager.monitor.ContainersMonitor: Memory usage of ProcessTree -537830258 for container-id 328418859ns: 8110596.609003112 MB of -537830258 GB physical memory used; 8110596.609003112 MB of 8110596.609003112 GB virtual memory used
```

**Message C:**
```
2024-02-11 13:36:33.533 org.apache.hadoop.yarn.server.resourcemanager.scheduler.capacity.LeafQueue: Reserved container  application=blk_1073742594_1770 resource=<memory:-729246220, vCores:-729246220> queue=blk_1073742594_1770: capacity=3549628.3406162458, ...
```

#### What CLPP does during compression (with `--experimental --schema-path schema.txt`)

For **Message A**, log-surgeon parses it into tokens:
- `timestamp` -> `2024-02-11 13:36:33.461` (header rule)
- Static text -> `org.apache.hadoop.mapred.MapTask: (RESET) equator `
- `int` -> `-300064699` (recognized as integer via `cIntSet`)
- Static text -> ` kv `
- `int` -> `-300064699`
- ... and so on for the remaining numbers

CLPP builds a **logtype string** by replacing captured variables with `%fully_qualified_name%` placeholders:
```
org.apache.hadoop.mapred.MapTask: (RESET) equator %message.int% kv %message.int%(%message.int%) kvi %message.int%(%message.int%)
```

**Schema tree** (global, shared across all records) for Message A with the **default** schema:

```
Node 0: LogMessage (key = "")
Node 1: LogType    (key = "log_type")
Node 2: LogTypeID  (key = "0")           ← logtype dict ID as string
Node 3: Integer    (key = "int", count=5) ← ONE node for ALL 5 integer positions
```

**Schema** (per-record column list) for Message A:

```
[Node 0, Node 1, Node 2, Node 3, Node 3, Node 3, Node 3, Node 3]
                       ^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                       once     Node 3 repeated 5 times (one per variable)
```

This means `message.int: -300064699` would match if **any** of the 5 integer positions equals that value — the positions are not independently addressable.

For **Message C** with a **Hive-specific** schema that defines `blk_id:blk_\d+_\d+`:

```
Node 0: LogMessage (key = "")
Node 1: LogType    (key = "log_type")
Node 2: LogTypeID  (key = "2")
Node 3: VarString  (key = "blk_id", count=2)   ← appears twice in the message
Node 4: Integer    (key = "memory", count=1)    ← unique column
Node 5: Integer    (key = "vcores", count=1)    ← unique column
```

Now `message.memory: -729246220` is unambiguous — it targets a specific column. `message.blk_id` still has 2 occurrences sharing one node, but that's less problematic since both hold the same kind of value (HDFS block IDs).

The **logtype string** for Message C would be:
```
org.apache.hadoop.yarn.server.resourcemanager.scheduler.capacity.LeafQueue: Reserved container  application=%message.blk_id% resource=<memory:%message.memory%, vCores:%message.vcores%> queue=%message.blk_id%: capacity=%message.float%, ...
```

### 3.5 How Search Works: Query Decomposition

This is where CLPP fundamentally differs from upstream CLP. Consider searching for:

**Query: `*container* memory:*`**

In upstream CLP, this would be a raw string wildcard match against `ClpString` columns. In CLPP, the query goes through `DecomposedQuery`:

1. The query is fed to `log_surgeon::ParserHandle::query_interpretations()`.
2. Log-surgeon tokenizes the query using the same delimiters and rules.
3. Multiple **interpretations** are generated (because wildcards create ambiguity -- see the design doc at `docs/src/dev-docs/design-parsing-wildcard-queries.md`).

**Interpretation 1** (wildcards span delimiters):
- Static text: `*container* memory:*`
- Leaf queries: `[]` (all matched as static text)
- Matches: logtypes whose template string matches `*container* memory:*`

**Interpretation 2** (`*container*` is a variable, `memory:*` has a variable after `:`):
- Static text: `* %message.blk_id% resource=<memory:%message.memory%` (approximate)
- Leaf queries: `[blk_id = "*container*", memory = "*"]`
- Matches: logtypes where static text matches AND the `blk_id`/`memory` columns match the leaf filters

**Interpretation 3** (all parts are variables):
- Static text: shorter
- Leaf queries: `[message = "*container*", memory = "*"]`
- Matches: different set of logtypes

For each interpretation, `SchemaMatch::resolve_clpp_query()`:
1. Matches the static text against logtype entries in the typed dictionary.
2. For matching logtypes, resolves which schemas contain those logtypes.
3. Builds an `AndExpr` of leaf equality filters for the variable columns.
4. Returns an `OrExpr` over all interpretations.

**The result**: only schemas whose logtypes structurally match the query are searched, and within those schemas, only the relevant variable columns are filtered. This is far more precise than the old `ClpString` wildcard match.

### 3.6 EXISTS Queries

The query `message.blk_id: EXISTS` asks "show me all log messages that have a `blk_id` field."

In `SchemaMatch::resolve_clpp_query()`, when the search AST contains an `EXISTS` operator on a `LogMessage` or `ParentRule` column:
1. `build_logtype_id_to_schema_id_map()` finds all schemas containing a `LogTypeID` node.
2. All schemas are registered as matching (since EXISTS just checks field presence).
3. The column `message.blk_id` is registered in the descriptor-to-schema mapping.

**Use case**: Find logs referencing a specific HDFS block by value:
```
message.blk_id: "blk_1073742594*"
```

Or find all messages that have a `blk_id` field regardless of value (where EXISTS matters on its own):
```
message.blk_id: EXISTS
```

Or combine field existence with an OR to broaden a search:
```
message.blk_id: EXISTS OR message.error: "timeout*"
```

### 3.7 Wildcard-on-Numeric Matching

**Query: `* -729*`**

In CLPP, this wildcard query can match against integer columns too. When `QueryRunner` encounters a wildcard filter on an integer column, `evaluate_numeric_wildcard_filter<int64_t>()`:
1. Reads the integer value (e.g., `-729246220`).
2. Converts it to a string: `"-729246220"`.
3. Applies wildcard match: `wildcard_match_unsafe("-729246220", "* -729*")`.
4. Returns true if it matches.

This is enabled by the `NarrowTypes` change that keeps `IntegerT` and `FloatT` in the matching types even for wildcard string literals.

### 3.8 `stats.logtypes` Output

Running `clp-s --experimental -s "stats.logtypes" <archive_path>` outputs:

```json
{"id":0,"count":342,"log_type":"org.apache.hadoop.mapred.MapTask: (RESET) equator %message.int% kv %message.int%(%message.int%) kvi %message.int%(%message.int%)"}
{"id":1,"count":87,"log_type":"org.apache.hadoop.ipc.Client: Retrying connect to server: %message.int%ms:%message.int%ms Already tried %message.int% time(s); retry policy is RetryUpToMaximumCountWithFixedSleep(maxRetries=%message.int%, sleepTime=%message.int% MILLISECONDS)"}
{"id":2,"count":15,"log_type":"org.apache.hadoop.yarn.server.resourcemanager.scheduler.capacity.LeafQueue: Reserved container  application=%message.blk_id% resource=<memory:%message.memory%, vCores:%message.vcores%> queue=%message.blk_id%: capacity=%message.float%, ..."}
```

Each line shows:
- `id`: The logtype's dictionary ID (referenced by `LogTypeID` nodes in the schema tree)
- `count`: How many messages in the archive match this pattern
- `log_type`: The logtype template string with `%qualified_name%` placeholders showing the variable positions

This data is the basis for the **LogType Statistics Dashboard** proposed in section 4.1.

### 3.9 A Simpler End-to-End Example

For a minimal, self-contained example:

**Schema (`schema.txt`):**
```
delimiters: \t\r\n :,"[]()

header:(?<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})
int:-?\d+
float:-?\d+\.\d+
service:[a-zA-Z]+\d*
status:INFO|WARN|ERROR|DEBUG
```

**Sample log:**
```
2024-03-15 10:23:45 WebServer42 ERROR Connection from 192.168.1.5 failed on port 8080 after 3 retries
```

**Log-surgeon parse output:**

| Token | Rule name | CLPP type (via cIntSet) |
|-------|-----------|------------------------|
| `2024-03-15 10:23:45` | `timestamp` (header) | -- (handled by timestamp system) |
| `WebServer42` | `service` | `VarString` (not in cIntSet) |
| `ERROR` | `status` | `VarString` |
| `192.168.1.5` | `hasNumber` (from default schema) | `VarString` |
| `8080` | `int` | `Integer` |
| `3` | `int` | `Integer` |

**CLPP logtype string:**
```
%message.service% %message.status% Connection from %message.hasNumber% failed on port %message.int% after %message.int% retries
```

**Schema tree** for this record:
```
Node 0: LogMessage (key = "")
Node 1: LogType    (key = "log_type")
Node 2: LogTypeID  (key = "0")
Node 3: VarString  (key = "service", count=1)    ← unique column
Node 4: VarString  (key = "status", count=1)     ← unique column
Node 5: VarString  (key = "hasNumber", count=1)  ← unique column
Node 6: Integer    (key = "int", count=2)         ← shared by both integer positions!
```

Note: both `8080` and `3` matched the `int` rule, so they share Node 6. A query for `message.int: 8080` would match if **either** integer position equals 8080. If you need to distinguish port numbers from retry counts, you'd need a schema with separate rule names like `portNum:\d{1,5}` and `retries:\d+`.

**Query: `*ERROR* port*`**

Decomposed into interpretations:
1. Static text match: `*ERROR* port*` against logtype dictionary
2. With variable extraction: `static="*ERROR* %message.hasNumber% failed on port %message.int%*"`, leaf queries: `[hasNumber="*", int="*"]`
3. More variable extraction variants...

Each interpretation produces a different set of matching logtypes and leaf column filters.

### 3.10 The Motivating Example from the Wildcard Query Design Doc

The upstream design doc at `docs/src/dev-docs/design-parsing-wildcard-queries.md` provides this canonical example:

**Message:**
```
INFO Task task_12 assigned to container: [NodeAddress:172.128.0.41, ContainerID:container_15], operation took 0.335 seconds
```

**After CLP parsing, this produces:**
- Dictionary variables: `["task_12", "172.128.0.41", "container_15"]`
- Encoded variables: `[0.335]`
- Logtype: `INFO Task <dict-var> assigned to container: [NodeAddress:<dict-var>, ContainerID:<dict-var>], operation took <float> seconds`

**Query: `*task* took 0.3*`**

Four interpretations are generated:

| # | Dict var queries | Encoded var queries | Logtype query |
|---|----------------|--------------------|----|
| 1 | `["*task*"]` | `["0.3*"]` | `*<dict-var>* took <float>*` |
| 2 | `["*task*", "0.3*"]` | `[]` | `*<dict-var>* took <dict-var>*` |
| 3 | `[]` | `["0.3*"]` | `*task* took <float>*` |
| 4 | `["0.3*"]` | `[]` | `*task* took <dict-var>*` |

A message matching **any** interpretation matches the original query. In the CLPP system, these interpretations become `Interpretation` objects in `DecomposedQuery`, each with `m_static_text` and `m_leaf_queries`, and they're resolved by matching against the typed logtype dictionary and then building leaf column filters.

---

## 4. Market Research: Existing Observability & Logging Products

This section surveys major observability and logging products, identifying features where CLPP's technology (schema-aware log decomposition, logtype statistics, multi-interpretation query decomposition, EXISTS queries, wildcard-on-numeric matching, CLP-style compression) can improve or replace existing capabilities.

### 4.1 ClickHouse

**Product:** Open-source columnar OLAP database widely used as backend storage for observability stacks (ClickStack/HyperDX, SigNoz, custom). ([clickhouse.com](https://clickhouse.com/), [ClickStack](https://clickhouse.com/blog/clickstack-observability))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **Materialized columns** | Compute values at INSERT time from Map/Body columns, storing them as typed root-level columns. ~4x query speedup over map access. | [Materialized columns](https://clickhouse.com/docs/en/sql-reference/statements/alter/column#materialize-column) | **Replace**: CLPP automatically decomposes at compression time — no manual SQL expressions or schema design needed. |
| **Materialized views** (Null table pattern) | Source table → MV transformation → target table with decomposed schema. The standard pattern for making unstructured logs queryable. | [Materialized views](https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized) | **Replace**: CLPP's compression pipeline IS the transformation. No separate source/target/view tables to maintain. |
| **Data skipping indices** (bloom, minmax, set) | Probabilistic granule-level skipping. bloom_filter for equality, minmax for ranges, set for discrete values. "Generally ineffective" for OTel map access per docs. | [Data skipping indices](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes) | **Improve**: CLPP's logtype matching is deterministic (not probabilistic). If a logtype doesn't match, no data is read — no false positives. |
| **Text index** (v26.2+ GA) | Inverted index over tokenized data. ~45x speedup for full-text search. Supports `hasToken`, `hasAnyTokens`, `hasAllTokens`. | [Full-text search](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#full-text-search) | **Improve for decomposed logs**: CLPP eliminates the need for text search on the Body column entirely. Variables are in typed columns; static text is in the logtype dictionary. |
| **JSON column type** (`body_v2`) | Schemaless JSON body storage with auto sub-columns. Dynamic type extraction. Used in SigNoz for structured log bodies. | [JSON type](https://clickhouse.com/docs/en/sql-reference/data-types/newjson) | **Complement**: CLPP provides schema-driven decomposition; JSON column handles truly unstructured/variable fields. |
| **GenAI SQL** | Natural language to SQL in ClickHouse Cloud SQL Console. | [SQL Console](https://clickhouse.com/docs/en/cloud/query-data/sql-console) | **CLPP gap**: No equivalent. |
| **`normalized_query_hash`** | Groups queries differing only by literal values — useful for identifying query patterns. | [query_log](https://clickhouse.com/docs/en/operations/system-tables/query_log) | **Analogous concept**: ClickHouse groups query patterns; CLPP groups log message patterns. Same deduplication insight at different levels. |

#### Compression Comparison

| Aspect | ClickHouse | CLPP |
|--------|-----------|------|
| Strategy | Columnar block compression (ZSTD, DoubleDelta, LZ4) | Semantic decomposition (logtype dictionary + typed variable dictionaries) |
| Variable handling | Stored as raw values in columnar blocks | Variables stored in typed dictionaries (4-byte int IDs, 8-byte float IDs, string dict IDs) |
| Redundancy | Block-level dedup of similar values | Structural elimination: logtype template stored once, variables in typed dicts |
| Typical ratio | ~10-30x for OTel data ([benchmark](https://clickhouse.com/blog/clickhouse-vs-elasticsearch-observability)) | 10-169x via CLP-style separation ([CLP paper](https://www.vldb.org/pvldb/vol15/p1376-roditty.pdf)) |
| Complementary? | **Yes** — columnar + semantic decomposition could compound gains | |

### 4.2 Elasticsearch / ELK Stack

**Product:** Distributed search engine (Elasticsearch) + log shipper (Logstash/Beats) + visualization (Kibana). The most widely deployed log management stack. ([elastic.co](https://www.elastic.co/))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **Discover tab** | Primary log exploration UI. Query bar (KQL/Lucene/ES\|QL), field statistics (top 10 values), document inspection, comparison, runtime fields. | [Discover](https://www.elastic.co/guide/en/kibana/current/discover.html) | **Improve**: CLPP's per-logtype stats are more semantically meaningful than field-level top-10. A "LogType Statistics" view would complement Discover's field-centric view. |
| **ML Log Categorization** | Automatically "groups millions of similar log lines into categories for faster triage." Probabilistic, query-time clustering. | [Log monitoring](https://www.elastic.co/observability/log-monitoring) | **Improve**: CLPP provides deterministic, exact logtype templates at ingestion time. CLPP could serve as the deterministic foundation with ML anomaly detection layered on top. |
| **Grok processor** (ingest pipeline) | Regex-based pattern matching with 120+ built-in patterns. Extracts named captures from unstructured text. Type casting (`%{NUMBER:bytes:int}`). | [Grok processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/grok-processor.html), [Logstash grok](https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html) | **Replace**: CLPP's log-surgeon schema is more general-purpose and additionally produces logtype statistics, metadata, and enables schema-aware search decomposition. |
| **Dissect processor** (ingest pipeline) | Regex-free delimiter-based parsing. Simpler and faster than Grok for reliably structured data. | [Dissect processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html) | **Complement**: Dissect for simple cases; CLPP for complex unstructured logs with variable extraction. |
| **Dynamic mapping** | Auto-detects and adds new fields when documents are indexed. No manual schema required, but can cause mapping explosions. | [Dynamic mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-mapping.html) | **Complement**: CLPP's schema-on-write is more precise and avoids mapping explosions; Elastic's dynamic mapping is more flexible for unknown data. |
| **Exists query** | Returns documents containing an indexed value for a field. Inverted via `must_not` + `exists`. | [Exists query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html) | **Improve**: CLPP's EXISTS leverages the logtype dictionary — immediately identifies which logtypes contain the field, avoiding full scan. |
| **Wildcard query** | Term-level wildcard matching (`?` single char, `*` zero+). "Expensive query" — leading wildcards strongly discouraged. | [Wildcard query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-wildcard-query.html) | **Improve**: CLPP's query decomposition matches against logtype dictionary first (small, in-memory), then filters typed columns. More precise, narrower search space. |
| **Wildcard-on-numeric** | Not natively supported. Requires dual mapping (numeric + keyword type via multi-fields). | [Multi-fields](https://www.elastic.co/guide/en/elasticsearch/reference/current/multi-fields.html) | **New capability**: CLPP's `evaluate_numeric_wildcard_filter<T>()` converts numbers to strings at query time — no dual mapping needed. |
| **Runtime fields** | Query-time computed fields via Painless scripts. No reindexing needed, but "expensive" and slower. | [Runtime fields](https://www.elastic.co/guide/en/elasticsearch/reference/current/runtime.html) | **CLPP gap**: No equivalent. Schema is fixed at ingestion time. |
| **ES\|QL** | Piped query language (`FROM index | WHERE condition | STATS count BY field`). Rapidly evolving. | [ES\|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) | **CLPP gap**: Would need a query language layer. |
| **LogsDB index mode** | "Up to 70% smaller footprint" via smarter compression and index sorting. | [Log monitoring](https://www.elastic.co/observability/log-monitoring) | **Complement**: LogsDB optimizes the inverted index; CLPP eliminates the need for inverted index on decomposed columns entirely. |
| **Streams** | AI-assisted log processing — parsing, partitioning, field extraction with minimal setup. | [Streams](https://www.elastic.co/guide/en/kibana/current/streams.html) | **Improve**: CLPP provides deterministic schema-driven decomposition without AI assistance. |

### 4.3 Datadog

**Product:** SaaS observability platform with unified logs, metrics, APM, and infrastructure monitoring. ([datadoghq.com](https://www.datadoghq.com/))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **Log Patterns** | Clusters logs based on similar `message` field values. Groups by Status and Service. Operates on a sample of 10,000 logs. Highlights aggregate values in yellow. | [Patterns](https://docs.datadoghq.com/logs/explorer/analytics/patterns/), [Blog](https://www.datadoghq.com/blog/log-patterns/) | **Improve**: CLPP operates on the full dataset (not 10K sample). Patterns are deterministic (not probabilistic clustering). Exact occurrence counts per logtype. Typed variable placeholders (e.g., `%message.port%`) vs. generic highlighting. |
| **Pattern Inspector** | Visual breakdown of value distributions within a pattern. Shows bar chart of attribute values. | [Patterns](https://docs.datadoghq.com/logs/explorer/analytics/patterns/) | **Improve**: CLPP's `LogTypeMetadata` provides structural decomposition (which capture groups appear where), not just value distributions. Could combine both: structural decomposition + value distribution. |
| **Grok parsing rule suggestions** | Patterns view can suggest grok parsing rules to extract structured data from matching logs. | [Patterns](https://docs.datadoghq.com/logs/explorer/analytics/patterns/) | **Replace**: CLPP eliminates the need for grok rules — log-surgeon schema provides automatic, complete decomposition at ingestion time. |
| **Search syntax** | Full-text (`*:term`), attribute search (`@attr:value`), wildcards (`*`, `?`), boolean (AND, OR, `-`), numeric ranges, CIDR, array matching. | [Search syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/) | **Improve**: CLPP's query decomposition is structurally aware — it decomposes wildcard queries into interpretations that match the logtype dictionary, rather than brute-force text matching. |
| **Field existence** | `-@field:*` returns logs without an attribute. No positive existence operator — only negation via wildcard. | [Search syntax](https://docs.datadoghq.com/logs/explorer/search_syntax/) | **Improve**: CLPP's first-class `EXISTS`/`NEXISTS` operators on schema tree paths are more direct and efficient. |
| **Parsing pipelines** | Multi-stage log processing: grok parser, category parser, date remapper, etc. Configured per log source. | [Pipelines](https://docs.datadoghq.com/logs/log_configuration/pipelines/) | **Replace for unstructured logs**: CLPP's log-surgeon schema replaces manual grok pipeline configuration with automatic schema-driven parsing. |
| **Facet analytics** | Top values, distributions, and measures for any faceted field. | [Log Explorer](https://docs.datadoghq.com/logs/explorer/) | **Complement**: CLPP adds pattern-level analytics; Datadog provides field-level analytics. Both are useful. |
| **Log measures** | Numerical aggregations (count, avg, min, max, percentiles) on log attributes. | [Analytics](https://docs.datadoghq.com/logs/explorer/analytics/) | **CLPP gap**: CLPP's stats are limited to logtype counts. No arbitrary numerical aggregations. |

### 4.4 Splunk

**Product:** Enterprise platform for searching, monitoring, and analyzing machine-generated data. Schema-on-read architecture with SPL query language. ([splunk.com](https://www.splunk.com/))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **Patterns tab** | Keyword-based event grouping. Samples up to 50K events. Groups by keyword presence/absence. Granularity slider. Can save as event type. | [Patterns](https://docs.splunk.com/Documentation/Splunk/latest/Search/FindpatternswiththePatternsstab) | **Replace**: CLPP's structural logtype templates are deterministic and exact. Two events share a logtype iff they have the same structural pattern. Patterns tab uses keyword proximity — not structural. |
| **`cluster` command** | Term-vector-similarity grouping. Threshold `t` (0-1). Methods: termlist, termset, ngramset. | [cluster](https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/Cluster) | **Replace**: CLPP logtypes provide exact structural grouping, pre-computed at compression time. No similarity threshold tuning needed. |
| **Event types** | Named saved searches that classify events (`eventtype=foo`). Not structural patterns — just search filters. | [Event types](https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Abouteventtypes) | **Replace**: CLPP logtypes ARE structural event types — automatically derived with exact counts. No manual definition needed. |
| **Field extraction** | Manual regex-based extraction per sourcetype. Field Extractor GUI generates regex. Also via `props.conf` + `transforms.conf`. | [Field extraction](https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Extractfieldsfromsearchresults) | **Replace**: CLPP's log-surgeon schema automatically parses unstructured text into typed variables. No per-field regex needed. |
| **Data Models** | Manually designed hierarchical datasets for Pivot. Constraint inheritance. Acceleration via `tstats`. | [Data Models](https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Aboutdatamodels) | **Improve**: CLPP's schema tree IS an auto-generated hierarchical data model. Could auto-generate Splunk-compatible data models, eliminating manual design effort. |
| **SPL wildcards** | Glob-style matching on raw text. No structural awareness. | [Search language](https://docs.splunk.com/Documentation/Splunk/latest/Search/Aboutthesearchlanguage) | **Improve**: CLPP's multi-interpretation query decomposition decomposes wildcards into structural components matching the logtype dictionary. |
| **Field existence** | No native EXISTS. Workarounds: `field=*`, `isnotnull(field)` in eval. | [Search ref](https://docs.splunk.com/Documentation/Splunk/latest/SearchReference) | **Improve**: CLPP's EXISTS is first-class, operating on schema tree metadata. |
| **Summary indexing** | Pre-computed statistics via scheduled searches. Requires gap management. | [Summary indexing](https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Usesummaryindexing) | **Replace**: CLPP's `LogTypeStatArray` provides instant summary statistics with zero configuration — built at compression time, always up-to-date. |
| **Schema-on-read** | Raw events stored verbatim. Structure applied at search time. | [About fields](https://docs.splunk.com/Documentation/Splunk/latest/Knowledge/Aboutfields) | **Improve**: CLPP is a hybrid — structure computed at compression time, used at search time. Best of both: structure for fast queries + schema can evolve (re-compress). |

### 4.5 Grafana Loki

**Product:** Log aggregation system inspired by Prometheus. Label-based indexing with chunk storage — indexes only labels, not log line content. ([grafana.com/oss/loki](https://grafana.com/oss/loki/))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **Log Patterns** (Grafana UI) | Automatic pattern extraction during ingestion. Preserves static tokens literally, replaces dynamic values with `<_>` placeholders. Ephemeral — mines only "previous 3 hours." Requires pattern ingester enabled. | [Patterns](https://grafana.com/docs/grafana/latest/explore/simplified-exploration/logs/patterns/) | **Improve significantly**: CLPP logtypes are persistent (not 3-hour ephemeral). Typed placeholders (`%message.port%`) vs. generic `<_>`. Exact counts via `LogTypeStat`. Hierarchical structure via `ParentRule` nodes. CLPP patterns are deterministic and complete, not time-limited samples. |
| **Pattern volume graph** | Shows each pattern's log volume over time, making spikes visible. Include/Exclude buttons for filtering. | [Patterns](https://grafana.com/docs/grafana/latest/explore/simplified-exploration/logs/patterns/) | **Directly applicable**: This UI pattern is ideal for CLPP's logtype statistics. A "LogType Volume" view showing per-pattern counts over time would leverage the same UX. |
| **LogQL stream selectors** | `{app="nginx", status="500"}` — label-based filtering. Only labels are indexed. | [LogQL](https://grafana.com/docs/loki/latest/query/) | **Complement**: CLPP's schema tree provides structured field filtering beyond what labels offer. Labels for coarse partitioning; CLPP for fine-grained log content search. |
| **LogQL line filters** | `|=` (contains), `!=` (not contains), `\|~` (regex match), `!~` (regex non-match). Operate on raw log line content. | [Log queries](https://grafana.com/docs/loki/latest/query/log_queries/) | **Improve**: CLPP's query decomposition is structurally aware — it identifies which logtypes and variable columns to search, rather than scanning raw log lines. |
| **LogQL parsers** | `| json`, `\| logfmt`, `| pattern`, `\| regexp` — query-time field extraction. | [Log queries](https://grafana.com/docs/loki/latest/query/log_queries/) | **Replace for CLPP data**: CLPP-processed data already has extracted fields at ingestion time. No query-time parsing needed. |
| **Label-only indexing** | Only labels are indexed; log line content is not. Enables low memory footprint but forces full-text scans on line content. | [Architecture](https://grafana.com/docs/loki/latest/get-started/architecture/) | **Improve**: CLPP's logtype dictionary + typed variable columns provide structural indexing without full-text scan. Search can be pruned to relevant logtypes before touching log data. |
| **Chunk compression** | Stores compressed log chunks. Good for high-throughput ingestion but poor for search on content. | [Key concepts](https://grafana.com/docs/loki/latest/get-started/key-concepts/) | **Improve**: CLPP achieves 10-169x compression via variable dictionaries. Loki's compression is general-purpose (ZSTD on chunks). CLPP's semantic compression is strictly superior for repetitive log data. |
| **High-cardinality problem** | Loki's design explicitly avoids indexing high-cardinality fields (like user IDs, request IDs) because they explode label space and memory. | [Labels](https://grafana.com/docs/loki/latest/get-started/key-concepts/#labels) | **Solve**: CLPP's typed variable dictionaries handle high-cardinality natively — variables are stored in dictionaries (not as labels). A `blk_id` with millions of unique values is just dictionary entries, not label explosion. |

### 4.6 SigNoz

**Product:** Open-source, OpenTelemetry-native observability platform. Uses ClickHouse as sole datastore. ([signoz.io](https://signoz.io/), [GitHub](https://github.com/SigNoz/signoz))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **Log Explorer** | Three views: List, Time Series, Table. Live tail support. | [Logs](https://signoz.io/docs/logs-management/logs-explorer/) | **Directly applicable**: CLPP's logtype statistics would add a powerful "Patterns" view to the existing explorer. |
| **No log pattern detection** | **Major gap**: No built-in log pattern detection, no logtype concept, no message template grouping. | — | **Fill gap**: CLPP's logtype extraction + statistics directly provides the pattern detection and grouping that SigNoz lacks. This is the single highest-impact integration point. |
| **EXISTS / NOT EXISTS** operators | Supported in filter query language. Checks key membership in Map columns (`mapContains(attributes_string, 'host_name')`). | [Query syntax](https://signoz.io/docs/logs-management/query-syntax/) | **Improve**: CLPP's EXISTS operates on structured decomposition of log message content (not just top-level attributes), enabling `message.port: EXISTS`. |
| **Parsing pipelines** | Grok parser, regex parser, JSON parser, add/copy/move/remove/rename operators in OTEL Collector. | [Pipelines](https://signoz.io/docs/logs-management/pipelines/) | **Replace for unstructured logs**: CLPP's log-surgeon schema replaces manual grok/regex pipeline configuration. |
| **ClickHouse storage** | `logs_v2` table with Map columns for attributes, JSON `body_v2` column, token/ngram bloom filter indexes. ZSTD(2) compression on body. | [Schema](https://github.com/SigNoz/signoz/tree/main/pkg/query-service/app/logs) | **Improve compression**: CLPP's dictionary encoding would dramatically reduce storage for the `body` field. ZSTD(2) ~2-3x vs. CLPP 10-100x for repetitive logs. |
| **Filter query language** | ANTLR4 grammar. Boolean, comparison, string (LIKE/ILIKE/CONTAINS/REGEXP), set (IN/NOT IN), range (BETWEEN), existence (EXISTS/NOT EXISTS), function calls (has/hasAny/hasAll/hasToken). | [Query syntax](https://signoz.io/docs/logs-management/query-syntax/) | **Improve**: CLPP's query decomposition would enable structurally-aware wildcard search instead of brute-force LIKE matching. |

### 4.7 VictoriaLogs

**Product:** Open-source log database from the VictoriaMetrics team. Zero-config, single-binary, pipe-based LogsQL. ([victoriametrics.com/products/victorialogs](https://victoriametrics.com/products/victorialogs/), [GitHub](https://github.com/VictoriaMetrics/VictoriaLogs))

#### Key Features & CLPP Application

| Feature | Description | Docs | CLPP Improvement |
|--------|-------------|------|-----------------|
| **`collapse_nums` pipe** | Query-time pattern detection. Replaces variable portions with typed placeholders: `<N>` (integer/hex), `<UUID>`, `<IP4>`, `<TIME>`, `<DATE>`, `<DATETIME>`, `<W>` (any word). Round-trip with `pattern_match` filter. | [LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/) | **Replace**: CLPP's ingestion-time logtype extraction is strictly superior: persisted (not re-derived every query), typed (`%message.port%` not `<N>`), schema-driven, enables compression. |
| **`pattern_match` filter** | Matches patterns using the same placeholder syntax as `collapse_nums`. | [LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/) | **Accelerate**: Could search the logtype dictionary (O(log N)) instead of scanning all records. |
| **`extract` pipe** | Pattern-based field extraction at query time. Conditional extraction supported. | [LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/) | **Replace for common patterns**: CLPP-processed data already has extracted fields. `extract` only needed for ad-hoc queries beyond the schema. |
| **Pattern statistics** | `collapse_nums | stats count() by (_msg)` — full data scan required every time. | [LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/) | **Replace**: CLPP's `LogTypeStatArray` provides instant pattern statistics (O(1), no data scan). |
| **Field presence** | `field:*` (any value), `field:""` (empty/missing). | [LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/) | **Improve**: CLPP's EXISTS is a metadata-level operation (check schema tree) vs. VictoriaLogs' data block scan. |
| **Columnar compression** | ~10x typical, up to 100x for repetitive data. Columnar + stream grouping + type encoding. | [FAQ](https://docs.victoriametrics.com/victorialogs/faq/) | **Complementary**: CLPP's semantic decomposition + VictoriaLogs' columnar block compression could compound compression gains. The two approaches attack different axes of redundancy. |
| **~50 query pipes** | Rich analytics: `stats`, `uniq`, `sort`, `facets`, `field_names`, `field_values`, `join`, `histogram`, `rate`, etc. | [LogsQL](https://docs.victoriametrics.com/victorialogs/logsql/) | **CLPP gap**: VictoriaLogs has more mature analytics tooling. CLPP's stats are limited to logtype counts. |

---

### 4.8 Cross-Product Comparison: Log Pattern / Logtype Features

This is the most directly applicable feature area for CLPP. Every major product has some form of log pattern detection, but none match CLPP's approach:

| Product | Pattern Feature | When Applied | Persistence | Typed Placeholders | Exact Counts | Schema-Aware |
|---------|----------------|-------------|-------------|-------------------|-------------|-------------|
| **CLPP** | Logtype dictionary | Ingestion (compression) | Persistent in archive | Yes (`%message.port%`) | Yes (`LogTypeStat`) | Yes (log-surgeon) |
| **Datadog** | Log Patterns | Query time (sample 10K) | Ephemeral | No (yellow highlighting) | No (approximate) | No |
| **Grafana Loki** | Patterns tab | Ingestion (pattern ingester) | Ephemeral (3h window) | No (`<_>` only) | No | No |
| **Elasticsearch** | ML Categorization | Query/analysis time | Not stored | No | No (probabilistic) | No |
| **Splunk** | Patterns tab / `cluster` | Query time (sample 50K) | Not stored | No (keyword-based) | No (estimated) | No |
| **VictoriaLogs** | `collapse_nums` | Query time | Not stored | Partial (7 fixed types: `<N>`, `<UUID>`, etc.) | No (must re-scan) | No |
| **SigNoz** | None | — | — | — | — | — |
| **ClickHouse** | None native | — | — | — | — | — |

**Key differentiators of CLPP:**
1. **Ingestion-time**: Patterns are computed once at compression time and stored permanently — no re-computation cost.
2. **Typed, named placeholders**: `%message.port%` (integer) vs. `<N>` or `<_>` — enables precise per-variable search and type-specific compression.
3. **Exact statistics**: `LogTypeStatArray` provides instant O(1) pattern counts without any data scan.
4. **Schema-aware search**: Query decomposition matches against the logtype dictionary before touching log data — pruning the search space deterministically.
5. **Compression-enabling**: The logtype dictionary IS the compression mechanism, not just a search aid.

### 4.9 Cross-Product Comparison: Search Capabilities

| Capability | CLPP | Elasticsearch | Datadog | Splunk | Loki | ClickHouse |
|-----------|------|-------------|---------|--------|------|-----------|
| **Wildcard query** | Multi-interpretation decomposition against logtype dict + typed column filters | Inverted-index term scan ("expensive") | Text matching on message | Glob on raw text | Line filter (`\|=`, `|~`) | LIKE/text index |
| **Field existence** | First-class `EXISTS`/`NEXISTS` on schema tree | `exists` query (inverted index) | `-@field:*` (negation only) | `field=*` (workaround) | No direct equivalent | `mapContains` on Map keys |
| **Wildcard-on-numeric** | `evaluate_numeric_wildcard_filter<T>()` | Not supported (needs dual mapping) | Not supported | Not supported | Not supported | Not supported (needs casting) |
| **Schema-aware pruning** | Matches logtype dict first (exact, deterministic) | Bloom filter skipping (probabilistic) | No | No | No | Data skipping indices (probabilistic) |
| **Query explanation** | Decomposition shows interpretations + matched logtypes | `explain` API | No | Search job inspector | No | `query_log` + `EXPLAIN` |

### 4.10 Cross-Product Comparison: Compression & Storage

| Product | Approach | Typical Ratio | High-Repetition Ratio |
|---------|----------|--------------|----------------------|
| **CLPP** | Logtype dict + typed variable dicts | 10-50x | 50-169x |
| **ClickHouse** | Columnar ZSTD/DoubleDelta | 10-30x | Up to 100x |
| **Elasticsearch** | Inverted index + source compression (LogsDB: ~70% smaller) | 2-5x | 5-10x |
| **Loki** | Label-based chunks + ZSTD | 5-10x | 10-20x |
| **VictoriaLogs** | Columnar + stream grouping + ZSTD | ~10x | Up to 100x |
| **Splunk** | Journal + tsidx compression | 2-5x | 5-15x |
| **Datadog** | Proprietary (undisclosed) | N/A (SaaS) | N/A |

**Key insight**: CLPP's semantic compression is complementary to columnar/block compression. A system combining both (CLPP decomposition → columnar storage of typed variables) could achieve the highest compression ratios.

---

### 4.11 Innovative & Educational CLPP Applications

Beyond feature parity with existing products, CLPP's unique capabilities enable novel applications:

#### Innovative Use Cases

1. **Logtype Anomaly Radar** — Real-time visualization of logtype frequency changes. Unlike traditional log rate alerts (volume spikes), this shows *which specific message patterns* are spiking or disappearing. The `LogTypeStat` data enables per-pattern rate tracking that no other product provides natively. A radial chart where each spoke is a logtype, with color indicating rate change from baseline, would surface pattern-level anomalies invisible to volume-based alerting.

2. **Schema Evolution Tracker** — Track how logtype populations change over time across archive versions. When a service deployment introduces new logtypes or changes existing ones, the diff between pre- and post-deployment logtype statistics reveals the exact structural impact. This is impossible with query-time pattern detection (which has no persistence) and uniquely enabled by CLPP's stored logtype dictionaries.

3. **Compression Efficiency Heatmap** — Show which logtypes contribute most to archive size vs. their frequency. A logtype with many unique variable values has low per-instance compression benefit; a logtype with few variable values compresses extremely well. This helps schema designers identify which rule names to split (reducing ambiguous `int` → specific `port`, `memory`, `vcores`) for maximum compression and search precision.

4. **Query Decomposition Playground** — An interactive UI where users type a wildcard query and see all interpretations visualized as a decision tree: static text pattern → matched logtypes → leaf column filters. Each interpretation shows how many logtypes it matches and which schemas it targets. This is both a debugging tool (why did/didn't my query match?) and an educational tool (how does CLPP decompose queries?).

5. **Cross-Archive Logtype Diff** — Compare logtype dictionaries between two archives (e.g., prod vs. staging, before vs. after deployment). Shows which logtypes exist in one but not the other, which have different frequencies, and which have identical templates but different variable distributions. Enables "what changed in the logging output?" queries that are structurally impossible with raw-text-based systems.

#### Educational Use Cases

6. **Interactive Schema Tree Explorer** — A tree visualization of the schema tree (`LogMessage` → `LogType` + `LogTypeID` + typed children + `ParentRule` intermediaries). Users click nodes to see: type, count, qualified name, and sample values. This teaches how CLPP's structural decomposition works by making the normally invisible schema tree visible and explorable.

7. **Variable Deduplication Visualizer** — Show how many times each variable value appears across logtypes, demonstrating why dictionary compression works. For example, the same IP address appearing in 50 different logtypes shares a single dictionary entry. An animation showing "before compression" (repeated raw values) → "after compression" (dictionary references) makes the compression mechanism tangible.

8. **Wildcard Interpretation Disambiguator** — When a user types `*container* memory:*`, show step-by-step how log-surgeon tokenizes the query, how multiple interpretations arise from ambiguous wildcard boundaries, and how each interpretation maps to specific logtype templates. This teaches the fundamental insight that wildcard queries are ambiguous and CLPP resolves the ambiguity exhaustively.

9. **Compression Ratio Simulator** — Given a log file, show the compression ratio achievable with different log-surgeon schemas. Users can modify the schema (e.g., add `portNum:\d{1,5}` vs. using default `int:-?\d+`) and see how it affects both compression ratio and search precision. This demonstrates the tradeoff between schema specificity (better search, potentially better compression) and schema generality (fewer missed patterns).

10. **"Same Log, Different View" Comparison** — Show the same raw log message side-by-side in three representations: (a) raw text, (b) CLPP decomposed (logtype template + typed variable values), (c) traditional CLP (logtype + dictionary/encoded variables). Highlight what information is gained (typed, named variables) and what is preserved (compression ratio) by CLPP's approach.

---

### 4.12 Summary: CLPP's Market Position

**What CLPP uniquely provides** (no existing product has these in combination):
- Deterministic, ingestion-time log pattern extraction with exact occurrence statistics
- Schema-aware query decomposition that prunes search space before touching log data
- Typed, named variable placeholders enabling per-variable search and type-specific compression
- EXISTS queries on structured log message content (not just top-level attributes)
- Wildcard-on-numeric matching
- Compression as a first-class outcome of the decomposition process

**Where CLPP lags existing products**:
- No real-time streaming (batch archive model)
- Limited analytics beyond logtype counts (no arbitrary aggregations, percentiles, etc.)
- Requires upfront schema design (no zero-config option)
- No query language equivalent to SPL, ES|QL, or LogsQL
- No visualization layer (CLI only, WebUI planned in sections 4.1-4.7)

**Highest-impact integration targets**:
1. **SigNoz** — Fills the largest gap (no log pattern detection) with CLPP's core capability
2. **Grafana Loki** — Replaces ephemeral 3-hour patterns with persistent, typed logtype statistics; solves high-cardinality problem
3. **ClickHouse/SigNoz** — Adds semantic compression layer on top of columnar compression
4. **Elasticsearch/Datadog** — Provides deterministic alternative to probabilistic ML categorization

---

## 5. Current WebUI Architecture (Unchanged from Upstream)


### Tech Stack
- **Client**: React 19 + TypeScript, Vite 7, Ant Design 6 + MUI Joy, Zustand (state), TanStack React Query (server state), Chart.js (timeline), Monaco Editor (SQL), Socket.IO (real-time results), ANTLR4 (SQL parsing)
- **Server**: Fastify 5 + TypeScript, MongoDB (results + change streams), MySQL (metadata + jobs), Socket.IO server, Presto client, AWS S3 SDK
- **Common**: Shared TypeScript library with TypeBox schemas, config enums, socket events, metadata types
- **Monorepo**: npm workspaces (`common`, `client`, `server`)

### Pages
| Route | Component | Purpose |
|-------|-----------|---------|
| `/ingest` | `IngestPage` | Dashboard: space savings stats, archive details, compression job submission, job history |
| `/search` | `SearchPage` | Search interface: native wildcard search or Presto SQL, timeline, results table |
| `/streamFile` | `QueryStatus` | Loading page for stream file extraction → log viewer redirect |

### Current Stats/Metrics Display
| Metric | Location | Source |
|--------|----------|--------|
| Space savings % | IngestPage → SpaceSavings | MySQL `archives` table (compressed/uncompressed size) |
| Compressed/Uncompressed size | IngestPage → SpaceSavings | MySQL `archives` table |
| Time range (begin/end) | IngestPage → Details | MySQL `archives` table |
| Message count / File count | IngestPage → Details | MySQL `files` table |
| Search result count | SearchPage → QueryStatus | MongoDB metadata + table + timeline (takes max) |
| Query speed (bytes/sec + latency) | SearchPage → QueryStatus | Metadata from search job |
| Timeline bucket counts | SearchPage → ResultsTimeline | MongoDB change stream aggregation |
| Compression job history | IngestPage → Jobs | MySQL jobs table |

### Current Search Capabilities
- **Native (clp/clp-s)**: Plain text wildcard query input, case-sensitive toggle, time range filter, dataset selector (clp-s only)
- **Presto Guided**: Structured SQL builder (SELECT, FROM, WHERE, ORDER BY)
- **Presto Freeform**: Raw SQL editor with Monaco

---

---

## 6. Implementation Priority


Based on user impact and dependency order:

| Priority | Feature | Rationale |
|----------|---------|-----------|
| **P0** | Experimental mode toggle | Foundation — everything else depends on this |
| **P1** | LogType Statistics Dashboard | Highest user value — gives immediate insight into log data distribution |
| **P1** | Log Surgeon Schema Content Editor | Required to create CLPP-encoded archives from the UI; uses SchemaMonacoEditor |
| **P2** | EXISTS Query Support | Extends search capabilities significantly |
| **P2** | Query Decomposition Visualization | Debugging/education value for the new search model |
| **P3** | LogType Metadata Browser | Lower priority — mostly useful for debugging schemas |
| **P3** | Wildcard-on-Numeric awareness | Small UI hint, low effort but also low impact |

---

---

## 7. Key Files Reference


### New fork files (to understand CLPP internals):
- `components/core/src/clpp/DecomposedQuery.hpp` — query decomposition
- `components/core/src/clpp/LogTypeStat.hpp` — logtype statistics
- `components/core/src/clpp/LogTypeMetadata.hpp` — logtype metadata
- `components/core/src/clpp/Array.hpp` — Zstd-serializable array container

### Modified fork files (key changes):
- `components/core/src/clp_s/JsonParser.cpp` — structured log message parsing
- `components/core/src/clp_s/ArchiveWriter.cpp` — typed dictionary, stats, metadata storage
- `components/core/src/clp_s/ArchiveReader.cpp` — reading new archive sections
- `components/core/src/clp_s/search/SchemaMatch.cpp` — CLPP query resolution
- `components/core/src/clp_s/search/QueryRunner.cpp` — wildcard-on-numeric, disabled ClpString search
- `components/core/src/clp_s/CommandLineArguments.hpp` — `--experimental`, `--schema-path`, `stats.logtypes`
- `components/core/src/clp_s/clp-s.cpp` — `handle_experimental_queries()`
- `components/core/src/clp_s/SchemaTree.hpp` — new NodeType enums

### Schema and test data files:
- `components/core/config/schemas.txt` — default production schema
- `components/core/tests/test_schema_files/real_schema.txt` — full test schema
- `components/core/tests/test_network_reader_src/random.log` — Hadoop test log data (1000 lines)
- `docs/src/dev-docs/design-parsing-wildcard-queries.md` — wildcard query decomposition design
- `docs/src/user-docs/reference-unstructured-schema-file.md` — schema file format reference

### WebUI files to modify:
- `components/webui/common/src/config.ts` — add experimental mode config
- `components/webui/client/src/pages/IngestPage/index.tsx` — add logtype stats tab
- `components/webui/client/src/pages/SearchPage/SearchControls/Native/NativeControls.tsx` — EXISTS query support
- `components/webui/apps/webui/src/features/clpp/components/schema-monaco-editor/` — shared SchemaMonacoEditor component (used in compression form and Settings SchemaDialog)
- `components/webui/apps/webui/src/pages/IngestPage/Compress/ClppSchemaFormItems.tsx` — JSON-mode Schema selector (Default / Custom / saved schemas + SchemaMonacoEditor)
- `components/webui/apps/webui/src/components/ui/combobox.tsx` — Combobox UI component wrapping `@base-ui/react/combobox` (same pattern as Select)
- `components/webui/apps/webui/src/components/ui/` — other UI primitives (button, card, popover, skeleton, toggle)
- `components/webui/server/src/routes/api/search/index.ts` — decompose endpoint
- New files needed: logtype-stats API route, logtype-stats UI components, query decomposition panel

### Existing WebUI patterns to reuse:
- `DashboardCard` component — for logtype stats summary cards
- `VirtualTable` component — for logtype stats table
- `ResultsTimeline` (Chart.js) — pattern for bar chart of top logtypes
- `SearchState/useSearchStore` — Zustand pattern for search state
- `api/sql/index.ts` — pattern for SQL passthrough queries
- `SqlEditor` component — pattern for Monaco editor with local monaco-loader (used by SchemaMonacoEditor)
- `@/components/ui/select.tsx` — pattern for wrapping `@base-ui/react` primitives (used by Combobox)

---

## 8. Feature Design (with Real Data Mapping)

Each feature is mapped to real binary output from compressing 500 lines of `~/samples/clps/hive-24hr-ts.jsonl` (Hadoop YARN container logs as `{"message":"...","timestamp":"..."}` JSONL) via `clp-s c --experimental --schema-path ~/samples/clps/hive-24hr-0426.txt`. The schema is a rich Hadoop-specific schema with named rules for `fetcherID`, `attempt_id`, `job_id`, `byte_size`, `nodePort`, etc. — producing **22 logtypes** from 500 messages, with most variables having unique schema tree nodes (vs. the minimal schema's 9-position shared `int` node).

**Key binary observations:**
- Compression: 106,988 bytes → 8,740 bytes = **12.2x**
- `logtype_stats`: 52 bytes (zstd-compressed `LogTypeStatArray`, 22 entries)
- `logtype_metadata`: 276 bytes (zstd-compressed `LogTypeMetadataArray`)
- `schema_tree`: 460 bytes (zstd-compressed)
- `ls_schema`: 2,663 bytes (zstd-compressed log-surgeon schema text)
- Search with `--experimental` **crashes** (`std::out_of_range` in `map::at`) — the search path is prototype-quality code
- `stats.logtypes` query **crashes** (`DictionaryReader::OperationFailed`) — typed log dictionary incompatibility
- EXISTS queries return "No matching schemas" — KQL parser doesn't recognize CLPP schema tree paths
- JSON decompression is **lossy for duplicate keys**: 3 `%INT%` placeholders produce only 1 `INT` key in JSON output

**Key context from 2-clp fork and PR #2169:**
- The 2-clp fork adds a full **dashboard system**: MySQL persistence, Hono API, 9 panel types (timeseries, stat, table, barchart, logs, markdown, gauge, heatmap, piechart, row), variable system, time range picker, and plugin registry.
- **PR #2169** ([y-scope/clp#2169](https://github.com/y-scope/clp/pull/2169)) adds S3 compression job submission with job type (one-time vs scanner), logs type (JSON vs Text), S3 key browsing, scanner advanced config. No schema file upload.

---

### 8.1 Page Architecture Overview

```
+---Sidebar---+----Main Content Area--------------------------------------+
|             |                                                           |
| [Ingest]    |  IngestPage: Compress form, Job history, Archive stats   |
| [Explore]   |  ExplorePage: Log Explorer (renamed from "Search")        |
| [Dashboards]|  DashboardPage: Dashboard grid with panels                 |
| [Settings]  |  SettingsPage: Experimental toggle, Schema management     |
|             |                                                           |
+-------------+-----------------------------------------------------------+
```

**Key change:** "Search" → "Explore" to match Elasticsearch/Kibana convention. The Explore page absorbs search + log-pattern-centric features.


#### Prototyping Commands

No specific binary command for this architectural overview. The page structure is derived from the feature set below.

---

### 8.2 Explore Page (Log Explorer)

#### 8.2.1 Overall Layout

```
+-------------------------------------------------------------------------+
| [Time Range Picker]  [Dataset Select]  [Refresh]  [Auto-refresh v]     |
+-------------------------------------------------------------------------+
| +--Query Bar----------------------------------------------------+      |
| | *MapTask*                                         [Search]     |      |
| +---------------------------------------------------------------+      |
| | [Native] [Presto Guided] [Presto Freeform]  | [Interpret] v |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
| +--Filter Bar (active filters as chips)------------------------+      |
| | [x] service:web*  [x] message.fetcherID: EXISTS  [+ Add filter]  |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
| +--Left: Field Sidebar---+  +--Center: Main Content-----------------+ |
| |                        |  |                                        | |
| | INDEXED FIELDS         |  | +--Tab Bar--------------------------+  | |
| | > timestamp  100%      |  | | [Logs] [Patterns] [Schema] [Stats]|  | |
| | > service    45%       |  | +-----------------------------------+  | |
| | > host       30%       |  |                                        | |
| |                        |  | (tab content — see below)              | |
| | LOGTYPE FIELDS [CLPP]  |  |                                        | |
| | > fetcherID    95.0%  |  |                                        | |
| | > INT          57.2%  |  |                                        | |
| |   (shared: 2-3 pos)  |  |                                        | |
| | > header.timestamp 100% |  |                                        | |
| |                        |  |                                        | |
| +------------------------+  +----------------------------------------+ |
+-------------------------------------------------------------------------+
| +--Query Interpretation Panel [CLPP] (collapsible)--------------+      |
| | Interpretation 1 of N: [X logtypes matched]                   |      |
| | Static: *MapTask*                                             |      |
| | Leaf filters: (none — all matched as static text)             |      |
| | Matched logtypes: 1                                           |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
| +--Bottom: Results Table + Timeline-----------------------------+      |
| | Histogram timeline                                            |      |
| | #  timestamp         message                                 |      |
| | 1  2015-03-23 05:40  %header.timestamp%,%int% INFO...        |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
```

**Real data mapping:** The Field Sidebar's `fetcherID: 95.0%` and `INT: 57.2%` come from the decompressed output — 475 of 500 records have `fetcherID`, 286 have `INT`. The `(shared: 2-3 pos)` warning comes from analyzing the logtype templates which show up to 3 `%INT%` placeholders (closeInMemoryFile) and 2 `%fetcherID%` placeholders per template.


#### Prototyping Commands

No specific binary command. The layout is a UI design decision informed by the data available from the features below.

---

#### 8.2.2 Patterns Tab

```
+-------------------------------------------------------------------------+
| [Patterns Tab]                                                          |
+-------------------------------------------------------------------------+
| +--Pattern Search / Filter-------------------------------------+       |
| | [search patterns...              ] [Sort: Count v] [v All]  |       |
| +---------------------------------------------------------------+       |
|                                                                         |
| +--Pattern List------------------------------------------------+       |
| |                                                                |      |
| | [+]    68  (13.6%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: fetcher#%fetcher_    |      |
| |               id.fetcherID% about to shuffle...                |      |
| | [+]    68  (13.6%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: assigned %INT%...    |      |
| | [+]    68  (13.6%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: Assigning %node_    |      |
| |               Port.node_id%:%nodePort.port% with %INT%...    |      |
| | [+]    68  (13.6%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: Read %byte_size...  |      |
| | [+]    68  (13.6%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: for url=%map_...    |      |
| | [+]    67  (13.4%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: %nodePort% freed... |      |
| | [+]    46   (9.2%)  %logLevel.logLevel% [fetcher#%fetcher_   |      |
| |               id.fetcherID%] %javaFQCN%: closeInMemoryFile..|      |
| | [+]     1   (0.2%)  %logLevel.logLevel% [main] %javaFQCN%:  |      |
| |               MergerManager: memoryLimit=%KEY_VALUE.value%... |      |
| | ...                                                           |      |
| +---------------------------------------------------------------+      |
|                                                                         |
| +--Expanded Row (click [+] on top pattern)---------------------+       |
| | Logtype ID: 0                                                  |      |
| | Count: 68 (13.6% of 500 total)                               |      |
| |                                                                |      |
| | Template:                                                      |      |
| | %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%]          |      |
| | %javaFQCN%: fetcher#%fetcher_id.fetcherID% about to shuffle   |      |
| | output of map %attempt_id% decomp: %INT% len: %INT% to        |      |
| | %state_to.to_state%                                           |      |
| |                                                                |      |
| | Variables:                                                     |      |
| |   logLevel              (String)    1 position                 |      |
| |   fetcherID             (Integer)   2 positions  [!] SHARED    |      |
| |   javaFQCN              (String)    1 position                 |      |
| |   attempt_id            (String)    1 position                 |      |
| |   INT                   (Integer)   2 positions  [!] SHARED    |      |
| |   to_state              (String)    1 position                 |      |
| |                                                                |      |
| | [!] "fetcherID" is shared across 2 positions (thread name +    |      |
| |     body). "INT" is shared across 2 positions (decomp + len). |      |
| |     Queries on message.INT match EITHER position.              |      |
| |                                                                |      |
| | [Include] [Exclude] [Search this pattern]                     |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
```

**Real data mapping:** The pattern list comes directly from `LogTypeStatArray` (currently only accessible via `stats.logtypes` CLI query, which crashes on this build). The top 5 patterns appear 68 times each (13.6%), covering 340 of 500 messages (68%). The `[!] SHARED` warning is derived from counting `%int%` occurrences in the logtype template string — 2–3 positions sharing the `Integer("INT")` schema node in some logtypes, while `fetcherID` is shared across 2 positions (thread name + body).

**API:**
```
GET /api/logtype-stats?archive_id=<id>
Response: [{id: 0, count: 48, log_type: "%header.timestamp%,%int% INFO..."}, ...]

GET /api/logtype-values?archive_id=<id>&logtype_id=<id>&variable=message.int&limit=10
Response: [{value: "1427088391284", count: 48}, ...]
```


#### Prototyping Commands

**Command 1: Compress with rich schema**
```bash
head -500 /home/junhao/samples/clps/hive-24hr-ts.jsonl > /tmp/sample-500.jsonl
clp-s c --experimental \
  --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  --print-archive-stats \
  /tmp/compress-out /tmp/sample-500.jsonl
```

Output:
```
[info] total parsing time: 698 (0.000698)
[info] Var count: 619
[info] Log type count: 22
{"id":"05b7f8f4-...","size":8740,"uncompressed_size":106988}
[info] [stats] total messages searched: 0
[info] [stats] clps int filter check: 0
[info] [stats] clps float filter check: 0
[info] [stats] clps str filter check: 0
```

**Command 2: Attempt `stats.logtypes` query** (should output per-logtype counts as JSONL)
```bash
clp-s s /tmp/compress-out "stats.logtypes" --experimental
```

Output:
```
terminate called after throwing an instance of \
  'DictionaryReader<...>::OperationFailed'
  what(): DictionaryReader.hpp:153  Error code: 1
```

**CRASH** — the `stats.logtypes` search path crashes when reading the typed variable dictionary. This is a known prototype bug: the archive was written with a `VariableDictionaryWriter` (typed log dict) but the search reader initializes a `LogTypeDictionaryReader` expecting the old format.

**Command 3 (workaround): Parse `logtype_stats` binary directly**
```python
import zstandard, struct
dctx = zstandard.ZstdDecompressor()
with open('<archive_dir>/logtype_stats', 'rb') as f:
    decompressed = dctx.decompress(f.read(), max_output_size=1_000_000)
    num = struct.unpack('<Q', decompressed[0:8])[0]
    for i in range(num):
        count = struct.unpack('<Q', decompressed[8+i*8:16+i*8])[0]
        print(f"logtype[{i}]: count={count}")
```

Output:
```
logtype[0]: count=1
logtype[1]: count=500
logtype[2]: count=1
...
logtype[13]: count=68
logtype[14]: count=68
logtype[15]: count=13
logtype[16]: count=68
logtype[17]: count=68
logtype[18]: count=68
logtype[19]: count=22
logtype[20]: count=67
logtype[21]: count=46
```

**Command 4 (workaround): Extract logtype templates from decompressed output**
```bash
clp-s x --experimental /tmp/compress-out /tmp/decompress-out
python3 -c "
import json; from collections import Counter
lt = Counter()
for line in open('/tmp/decompress-out/original'):
    obj = json.loads(line)
    lt[obj['message']['log_type']] += 1
for t, c in lt.most_common():
    print(f'{c:4d}  {t[:120]}')
"
```

Output:
```
  68  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: fetcher#%fetcher_id.fetcherID% about to shuffle...
  68  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: assigned %INT% of %INT% to %nodePort.node_id%:...
  68  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: Assigning %nodePort.node_id%:%nodePort.port% with...
  68  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: Read %byte_size.size% bytes from map-output...
  68  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: for url=%map_output_url.url% sent hash...
  67  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: %nodePort.node_id%:%nodePort.port% freed...
  46  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: closeInMemoryFile -> map-output of size: %INT%...
  22  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: closeInMemoryFile -> map-output of size: %INT%...
  13  %logLevel.logLevel% [EventFetcher...] %javaFQCN%: %attempt_id%: Got %INT% new map-outputs
   1  %logLevel.logLevel% [main] %javaFQCN%: MergerManager: memoryLimit=%KEY_VALUE.value%...
   ... (11 more singleton logtypes)
```

**Mapping:** The binary `logtype_stats` file contains the per-logtype counts (22 entries). The logtype template strings come from the decompressed `log_type` field. Together they populate the Pattern List. The `[+] SHARED` warning is derived by counting `%INT%` occurrences within each template — 3 logtypes have 2+ INT placeholders sharing one `Integer("INT")` schema node. With the rich schema, most variables have unique names (fetcherID, attempt_id, etc.), but `INT` remains a shared fallback for uncategorized integers.

---

#### 8.2.3 Schema Tab

```
+-------------------------------------------------------------------------+
| [Schema Tab]                                                            |
+-------------------------------------------------------------------------+
| +--Schema Tree Explorer----------------------------------------+       |
| |                                                                |      |
| | v LogMessage (key: "")  [500 records]                         |      |
| |   > LogType    (key: "log_type")   [22 entries]                |      |
| |   > LogTypeID  (key: "0"..."21")   [22 leaf nodes]            |      |
| |   > String    (key: "logLevel")    [100%]                      |      |
| |   > String    (key: "javaFQCN")    [100%]                     |      |
| |   > Integer   (key: "fetcherID")    [95.0% — !! SHARED !!]     |      |
| |   > Integer   (key: "INT")         [57.2% — !! SHARED !!]     |      |
| |   > String    (key: "attempt_id") [30.0%]                     |      |
| |   > ...                                                        |      |
| |                                                                |      |
| | +--Node Detail (click "INT")--------------------------------+ |      |
| | | Node: Integer (key: "INT")                                 | |      |
| | | Type: Integer (4-byte dictionary IDs)                     | |      |
| | | Count: 286 (57.2% of records)                              | |      |
| | |                                                            | |      |
| | | !! SHARED NODE — appears up to 3x per record !!           | |      |
| | |                                                            | |      |
| | | In logtypes with shared INT (158 records), "INT" occupies: | |      |
| | |   closeInMemoryFile: map-output size, inMemory count,     | |      |
| | |                     commitMemory (3 positions)             | |      |
| | |   shuffle output: decomp bytes, len bytes (2 positions)  | |      |
| | |   assigned: assigned count, total count (2 positions)     | |      |
| | |                                                            | |      |
| | | A query like "message.INT: 384657" matches if             | |      |
| | | ANY of these positions equals that value.                  | |      |
| | |                                                            | |      |
| | | Suggested schema improvement:                               | |      |
| | |   map_output_size: of size: \d+  → message.map_output_size| |      |
| | |   in_memory_count: size\(\) -> \d+ → message.in_memory_count| |      |
| | |   commit_memory: commitMemory -> \d+ → message.commit_memory| |      |
| | |   decomp_bytes: decomp: \d+      → message.decomp_bytes    | |      |
| | |   len_bytes: len: \d+            → message.len_bytes      | |      |
| | |                                                            | |      |
| | | Appears in logtypes:                                        | |      |
| | |   #6: closeInMemoryFile...commitMem=%INT% (46)             | |      |
| | |   #7: closeInMemoryFile...commitMem=%hexId8% (22)         | |      |
| | |   #0: ...decomp: %INT% len: %INT%... (68)                 | |      |
| | |   #1: assigned %INT% of %INT%... (68)                      | |      |
| | |   ...                                                       | |      |
| | +------------------------------------------------------------+ |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
```

**Real data mapping:** The schema tree is the 342-byte `schema_tree` file in the archive. It contains the hierarchical node structure that was built during compression. The "SHARED NODE" analysis is computed by counting how many times the same `(parent_id, key_name, type)` triple appears in per-record schemas — or equivalently, by counting `%int%` occurrences in logtype template strings. The suggested improvements map to `cIntSet` entries in `JsonParser.cpp` that would turn generic `int` matches into semantically named variables.

**API:**
```
GET /api/schema-tree?archive_id=<id>
Response: {
  nodes: [
    {id: 0, parent_id: null, type: "LogMessage", key: "", count: 500},
    {id: 1, parent_id: 0, type: "LogType", key: "log_type", count: 500},
    {id: 2, parent_id: 0, type: "LogTypeID", key: "0", count: 48},
    ...
    {id: N, parent_id: 0, type: "Integer", key: "INT", count: 286},
    {id: N, parent_id: 0, type: "Integer", key: "fetcherID", count: 475}
  ]
}
```


#### Prototyping Commands

**Command 1: Parse `schema_tree` binary directly**
```python
import zstandard
dctx = zstandard.ZstdDecompressor()
with open('<archive_dir>/schema_tree', 'rb') as f:
    decompressed = dctx.decompress(f.read(), max_output_size=1_000_000)
    # schema_tree format: serialized SchemaTree with nodes
    # Each node: parent_id (int32), type (int32), key_name (string)
    print(f"schema_tree: {len(decompressed)} bytes decompressed")
```

Output:
```
schema_tree: 1037 bytes decompressed
```

The schema tree binary format is not self-describing at the Python level — it uses the C++ `SchemaTree::serialize()` format. The tree structure must be read via `ArchiveReader::read_schema_tree()` (C++ API), not by ad-hoc Python parsing.

**Command 2 (workaround): Infer schema tree from decompressed output**
```python
import json; from collections import Counter
key_usage = Counter()
for line in open('/tmp/decompress-out/original'):
    obj = json.loads(line)
    for k in obj['message']:
        if k != 'log_type': key_usage[k] += 1
for k, c in key_usage.most_common():
    print(f"  {k}: {c} ({c/500*100:.1f}%)")
```

Output:
```
  logLevel: 500 (100.0%)
  javaFQCN: 500 (100.0%)
  fetcherID: 475 (95.0%)
  INT: 286 (57.2%)
  node_id: 203 (40.6%)
  port: 203 (40.6%)
  attempt_id: 150 (30.0%)
  to_state: 68 (13.6%)
  durationSuffix: 68 (13.6%)
  size: 68 (13.6%)
  used_memory_size: 68 (13.6%)
  url: 68 (13.6%)
  hexId8: 46 (9.2%)
  hex_address: 2 (0.4%)
  value: 1 (0.2%)
  job_id: 1 (0.2%)
  PATH: 1 (0.2%)
  HAS_NUMBER: 1 (0.2%)
```

**Command 3: Read `ls_schema` (the stored log-surgeon schema)**
```python
import zstandard
dctx = zstandard.ZstdDecompressor()
with open('<archive_dir>/ls_schema', 'rb') as f:
    decompressed = dctx.decompress(f.read(), max_output_size=1_000_000)
    print(decompressed.decode('utf-8')[:500])
```

Output (truncated):
```
delimiters:\ \t\r\n!"#$%&'()*,:;<=>?@[]^_`{|}~

# Timestamp: ISO8601_subsec
TIMESTAMP:\d{4}\-\d{2}\-\d{2}[T ]\d{2}:\d{2}:\d{2}[,\.]\d+

used_memory:usedMemory \-\>(?<used_memory_size>\d+)
container_launcher:ContainerLauncher #(?<launcher_number>\d+)\]
...
```

**Mapping:** The Schema Tree Explorer UI reads from the C++ `SchemaTree` object (loaded via `ArchiveReader::read_schema_tree()`). The node detail panel (shared node warning, position analysis) requires cross-referencing the schema tree with logtype template strings to count per-variable occurrences. The `ls_schema` section stores the original log-surgeon schema text for search-time query decomposition. An API endpoint wrapping `ArchiveReader` is needed — direct binary parsing is impractical.

---

#### 8.2.4 Stats Tab

```
+-------------------------------------------------------------------------+
| [Stats Tab]                                                             |
+-------------------------------------------------------------------------+
|                                                                         |
| +--Summary Cards (4-up)----------------------------------------+       |
| |                                                                |      |
| | +----------+  +----------+  +----------+  +----------+       |      |
| | | 500      |  | 22       |  | 2        |  | 12.2x    |       |      |
| | | Total    |  | Logtypes |  | Shared   |  | Compress |       |      |
| | | Messages |  |          |  | Nodes    |  | Ratio    |       |      |
| | +----------+  +----------+  +----------+  +----------+       |      |
| |                                                                |      |
| +---------------------------------------------------------------+       |
|                                                                         |
| +--Top Logtypes Bar Chart--------------------------------------+       |
| |                                                                |      |
| |    68 |██████████████████████████████████████ Fetcher: about... |      |
| |    68 |██████████████████████████████████████ Fetcher: assigned |      |
| |    68 |██████████████████████████████████████ Fetcher: Assigning|      |
| |    68 |██████████████████████████████████████ Fetcher: Read...  |      |
| |    68 |██████████████████████████████████████ Fetcher: for url..|      |
| |    67 |██████████████████████████████████████ Fetcher: freed... |      |
| |    46 |████████████████████████████ MergeMgr: closeInMemory... |      |
| |    22 |██████████████ MergeMgr: closeInMemory (commitMem=INT)  |      |
| |    13 |████████ EventFetcher: Got new map-outputs              |      |
| |     1 |█ MetricsConfig: loaded properties...                    |      |
| |   ...                                                           |      |
| +---------------------------------------------------------------+      |
|                                                                         |
| +--Schema Coverage----------------------------------------------+       |
| | Shared nodes: INT (286 recs, 2–3 pos), fetcherID (475 recs, 2 pos) |      |
| | With the rich schema, only 2 shared nodes remain.             |      |
| | Adding map_output_size/commit_memory rules would eliminate INT.|      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
```

**Real data mapping:** Summary cards from `LogTypeStatArray` (22 logtypes), schema tree analysis (2 shared nodes: `Integer("INT")` and `Integer("fetcherID")`), and archive stats JSON (`"size":8740,"uncompressed_size":106988` → 12.2x ratio). The bar chart uses the same data as the Patterns tab but in chart form.


#### Prototyping Commands

**Command 1: Compression with `--print-archive-stats`**
```bash
clp-s c --experimental \
  --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  --print-archive-stats \
  /tmp/compress-out /tmp/sample-500.jsonl
```

Output (JSON line):
```json
{"begin_timestamp":0,"end_timestamp":0,"id":"05b7f8f4-02c1-474c-848a-00a5f67aea42",
 "is_split":false,
 "range_index":[{"e":500,"s":0}],
 "size":8740,"uncompressed_size":106988}
```

Compression ratio: 106,988 / 8,740 = **12.2x**

**Command 2: Archive file sizes**
```bash
ls -la <archive_dir>/
```

Output:
```
-rw-rw-r--  3550  0          (column data)
-rw-rw-r--     8  array.dict
-rw-rw-r--   389  header
-rw-rw-r--   914  log.dict   (typed variable dictionary)
-rw-rw-r--   276  logtype_metadata
-rw-rw-r--    52  logtype_stats
-rw-rw-r--  2663  ls_schema
-rw-rw-r--   269  schema_ids
-rw-rw-r--   460  schema_tree
-rw-rw-r--   163  table_metadata
-rw-rw-r--  2987  var.dict
```

**Command 3: Parse `logtype_stats` for summary cards**
```python
# See 8.2.2 Command 3 — produces 22 logtypes, top count=500, etc.
```

**Mapping:** Summary cards come from: `--print-archive-stats` JSON (size, uncompressed_size → compression ratio), `logtype_stats` binary (22 logtypes), schema tree analysis (shared node count from Python workaround). The bar chart uses the same data as the Patterns tab (8.2.2).

---

#### 8.2.5 Query Interpretation Panel (CLPP-specific)

```
+-------------------------------------------------------------------------+
| v Query Interpretation                                 [?] [Dismiss]    |
+-------------------------------------------------------------------------+
| Query: *Fetcher*                                                        |
|                                                                         |
| Decomposed into N interpretations:                                      |
|                                                                         |
| +--Interpretation 1 [X logtypes matched]--+   [MATCHED]                |
| | Static text:  *Fetcher*                 |                            |
| | Leaf filters:  (none — all as static)    |                            |
| | Matched logtypes:                         |                            |
| |   #0: ...Fetcher: fetcher#%int% about... |                            |
| |   #1: ...Fetcher: for url=13562/mapOu... |                            |
| |   #2: ...InMemoryMapOutput: Read %int%.. |                            |
| |   #3: ...MergeManagerImpl: closeInMem... |                            |
| +-------------------------------------------+                          |
|                                                                         |
| Search metrics (from binary output):                                    |
|   total messages searched: 500                                         |
|   clps int filter check: 0                                             |
|   clps float filter check: 0                                           |
|   clps str filter check: 0                                             |
|                                                                         |
| Note: search with --experimental currently crashes (prototype code).    |
| The query decomposition data would come from DecomposedQuery +          |
| SchemaMatch::resolve_clpp_query() exposed via API.                      |
+-------------------------------------------------------------------------+
```

**Real data mapping:** The search metrics are the real `spdlog` output from the binary. The interpretation structure comes from `DecomposedQuery` which produces `Interpretation` objects with `m_static_text` and `m_leaf_queries`. Currently only accessible internally — needs a new API endpoint. The crash (`std::out_of_range`) is a known prototype bug.

**API:**
```
GET /api/search/decompose?query=*Fetcher*&archive_id=<id>
Response: {
  interpretations: [
    {static_text: "*Fetcher*", leaf_filters: [], matched_logtype_ids: [0,1,2,3]},
    ...
  ],
  metrics: {messages_searched: 500, int_checks: 0, float_checks: 0, str_checks: 0}
}
```


#### Prototyping Commands

**Command 1: Search with wildcard query**
```bash
clp-s s /tmp/compress-out "*Fetcher*" --experimental
```

Output:
```
terminate called after throwing an instance of 'std::out_of_range'
  what():  map::at
```

**CRASH** — all search queries crash when `--experimental` is enabled, whether using wildcards (`*Fetcher*`), plain strings (`Fetcher`), or KQL. The crash occurs in `SchemaMatch::resolve_clpp_query()` or `QueryRunner::populate_string_queries()` when it encounters a `ClpStringT` node from the CLPP archive. The old search path is disabled but not properly replaced.

**Command 2: Search without `--experimental` (same archive)**
```bash
clp-s s /tmp/compress-out "Fetcher"
```

Output:
```
terminate called after throwing an instance of 'std::out_of_range'
  what():  map::at
```

Same crash — the archive was created with `--experimental` (typed variable dictionary), so the non-experimental reader also fails because `m_log_dict` expects `LogTypeDictionaryReader` format but gets `VariableDictionaryReader` format.

**Cannot demonstrate query decomposition at this time.** The `DecomposedQuery` engine works at the C++ level (tested in unit tests) but cannot be exercised end-to-end through `clp-s s` due to the search crash. An API endpoint wrapping `DecomposedQuery::decompose()` directly (without going through the full search pipeline) would be needed to populate this panel.

---

#### 8.2.6 Field Sidebar — Logtype Fields Section

```
+--Field Sidebar----------------------------+
|                                            |
| INDEXED FIELDS                             |
|   > timestamp          100%                |
|   > service            45%                |
|                                            |
| LOGTYPE FIELDS            [CLPP] [?]       |
|   > header.timestamp  100%                 |
|   > message.int       100%  [!]            |
|                                            |
| [!] = shared across multiple positions    |
|                                            |
|   click field to:                          |
|   1. Add to table columns                 |
|   2. Add filter: message.int: EXISTS      |
|   3. See top values + distribution         |
+--------------------------------------------+
```

**Real data mapping:** With the current default schema, only 2 logtype fields appear: `header.timestamp` and `message.int`. With a richer schema (e.g., adding `fetcher_id`, `job_id`, `attempt_id`, `byte_count` rules), the sidebar would show 5+ typed fields. The `[!]` badge is triggered because `message.int` has `count` > 1 in per-record schemas (it appears multiple times per record).


#### Prototyping Commands

**Command: Extract variable key usage from decompressed output**
```python
import json; from collections import Counter
key_usage = Counter()
for line in open('/tmp/decompress-out/original'):
    obj = json.loads(line)
    for k in obj['message']:
        if k != 'log_type': key_usage[k] += 1
for k, c in key_usage.most_common():
    print(f"  {k}: {c} ({c/500*100:.1f}%)")
```

Output:
```
  logLevel: 500 (100.0%)
  javaFQCN: 500 (100.0%)
  fetcherID: 475 (95.0%)
  INT: 286 (57.2%)
  node_id: 203 (40.6%)
  port: 203 (40.6%)
  attempt_id: 150 (30.0%)
  to_state: 68 (13.6%)
  durationSuffix: 68 (13.6%)
  size: 68 (13.6%)
  used_memory_size: 68 (13.6%)
  url: 68 (13.6%)
  hexId8: 46 (9.2%)
  hex_address: 2 (0.4%)
  value: 1 (0.2%)
  job_id: 1 (0.2%)
  PATH: 1 (0.2%)
  HAS_NUMBER: 1 (0.2%)
```

**Mapping:** The Field Sidebar's "LOGTYPE FIELDS" section displays these key names with their record coverage percentages. The `[!]` shared-node badge would appear on `INT` (appears in 57.2% of records, with 2–3 positions per record in some logtypes). With the rich schema, most fields have unique names (fetcherID, attempt_id, etc.), so the deduplication trap is limited to `INT`. Note: the key names in the decompressed JSON (`logLevel`, `fetcherID`) are the *leaf* capture names, not the fully-qualified names (`%logLevel.logLevel%`, `%fetcher_id.fetcherID%`) — the UI should display the fully-qualified path for clarity.

---

#### 8.2.7 Filter Bar with EXISTS Support

```
+--Filter Bar------------------------------------------------------+
|                                                                   |
| [x] message.int: EXISTS    [CLPP]                                |
| [x] timestamp: [2015-03-23 05:39:00 to 05:41:00]                |
|                                                                   |
| [+ Add Filter]  [+ Add CLPP Filter v]                            |
|                  | message.fetcherID: EXISTS  ← 475 records (95.0%)     |
|                  | message.int: NEXISTS   ← 0 records             |
|                  +-----------                                     |
+-------------------------------------------------------------------+
```

**Real data mapping:** With the rich schema, `message.fetcherID: EXISTS` would match 475 records (95.0% — fetcher threads), while `message.INT: EXISTS` matches 286 records (57.2% — logtypes with generic integer variables). The `NEXISTS` counterparts match the complement.


#### Prototyping Commands

**Command 1: EXISTS query with fully-qualified field name**
```bash
clp-s s /tmp/compress-out 'message.fetcher_id.fetcherID: EXISTS' --experimental
```

Output:
```
[info] No matching schemas for query 'message.fetcher_id.fetcherID: EXISTS'
```

**Command 2: EXISTS query with short field name**
```bash
clp-s s /tmp/compress-out 'fetcherID: EXISTS' --experimental
```

Output:
```
[info] No matching schemas for query 'fetcherID: EXISTS'
```

**Cannot demonstrate EXISTS filtering at this time.** Both fully-qualified and short-name EXISTS queries return "No matching schemas." This is likely because the KQL parser does not recognize CLPP schema tree paths as valid field names — it only knows the top-level JSON keys (`message`, `timestamp`). The `SchemaMatch::resolve_clpp_query()` code path for EXISTS queries (which walks the schema tree to find matching column IDs) is not being reached. Fixing the search crash (8.2.5) is a prerequisite for EXISTS support. The EXISTS semantics are implemented in C++ (`SchemaMatch.cpp` lines handling `SearchUtils::is_truex_exists_op()`) but cannot be exercised through the CLI yet.

---

### 8.3 Compression Form Updates

#### 8.3.1 Updated Form Layout

```
+-------------------------------------------------------------------------+
| Compress                                                                |
+-------------------------------------------------------------------------+
|                                                                         |
| Job Type:  (o) One-time  ( ) Scanner     [from PR #2169]               |
| Logs Type: (o) JSON  ( ) Text            [from PR #2169]               |
|                                                                         |
| +--Source Configuration----------------------------------------+        |
| | [If One-time]                                                 |       |
| | Paths: [+ Add path]  (existing PathsSelectFormItem)           |       |
| | [If Scanner]                                                  |       |
| | Region: [us-east-1 v]  S3 Bucket: [my-log-bucket]            |       |
| | S3 Prefixes: [+ Add prefix]           [from PR #2169]        |       |
| +---------------------------------------------------------------+       |
|                                                                         |
| Timestamp Key: [__timestamp__]  (disabled if Text)                     |
|                                                                         |
| [If JSON selected] ─────────────────────────────────────────────        |
| Schema: [Default v]  [?]                                               |
|   Options: Default | Custom | <saved schemas...>                      |
|                                                                         |
|   [If "Custom" selected:]                                              |
|   Schema Content:                                                      |
|   +-------------------------------+                                     |
|   | (Monaco Editor — edit schema |                                     |
|   |  text inline via              |                                     |
|   |  SchemaMonacoEditor)         |                                     |
|   | delimiters: \t\r\n !"#%&...  |                                     |
|   | int:-?\d+                    |                                     |
|   | float:-?\d+\.\d+            |                                     |
|   +-------------------------------+                                     |
|                                                                         |
|   [If a saved schema selected:]                                        |
|   Schema Content:                                                      |
|   +-------------------------------+                                     |
|   | (Monaco Editor — pre-filled  |                                     |
|   |  with saved schema content,  |                                     |
|   |  editable via                 |                                     |
|   |  SchemaMonacoEditor)         |                                     |
|   | delimiters: \t\r\n !"#%&...  |                                     |
|   | int:-?\d+                    |                                     |
|   | float:-?\d+\.\d+            |                                     |
|   +-------------------------------+                                     |
| ───────────────────────────────────────────────────────────────        |
|                                                                         |
| [If Text selected]                                                     |
| (no schema option — Text mode uses default clp-s behavior)             |
|                                                                         |
| Dataset: [default]                                                      |
|                                                                         |
| +--Scanner Advanced (collapsible)-------+  [from PR #2169]            |
| | Scanning Interval: [30] sec           |                               |
| | Buffer Flush Threshold: [4 GiB]      |                               |
| | Buffer Timeout: [300] sec            |                               |
| | Buffer Channel Capacity: [16]         |                               |
| +---------------------------------------+                               |
|                                                                         |
| [Compress]                                                              |
+-------------------------------------------------------------------------+
```

**Key design changes from the original form:**

1. **Schema selector lives under JSON mode, not as a standalone section:** The `Schema` dropdown only appears when "JSON" is selected as the Logs Type. This is because `clp-s --schema-path` is designed for JSONL input — the schema tells clp-s how to parse and type JSON fields. Text (unstructured) mode does not use a schema; it uses the default clp-s behavior. The previous implementation incorrectly tied the schema selector to Text mode (`unstructured=true`) — that was a misunderstanding of how `clp-s` uses schemas.

2. **"Default" schema option:** When JSON mode is selected with "Default" (the default option), the compression job sends no `schemaContent` — clp-s uses its built-in default schema. Selecting "Custom" shows the Monaco editor for writing schema text from scratch. Selecting a saved schema pre-fills the editor with that schema's content. The dropdown replaces the previous "Unstructured logs processor" label and "Log Convertor" option, which was incorrectly named for JSON mode.

3. **No `--experimental` flag in the WebUI:** The `--experimental` flag is never exposed or sent by the WebUI. The WebUI simply sends `schemaContent: string | null` in the compression job creation body. When `schema_content` is present in the `ClpIoConfig`, the Python worker automatically writes it to a temp file and appends `--experimental --schema-path <temp>` to the `clp-s` command. This abstracts away the `--experimental` flag from the user — providing schema content is sufficient.

4. **Shared SchemaMonacoEditor component:** A reusable Monaco editor component at `features/clpp/components/schema-monaco-editor/` is used in both the compression form (inside the JSON-mode Schema dropdown) and the Settings SchemaDialog. It uses a local `monaco-loader` to bundle Monaco instead of using CDN, following the same pattern as the existing `SqlEditor` component.

**API changes:**
```
POST /api/compress
Body addition: { ..., schemaContent: string | null }
```

The server maps `body.schemaContent ?? null` to `schema_content` in `ClpIoConfig`. The worker then: if `schema_content` is present, writes it to a temp file and passes `--experimental --schema-path <temp>` to `clp-s`.

**Note on the current implementation:** The existing `ClppSchemaFormItems` component is wired under `unstructured=true` (Text mode) and labels itself "Unstructured logs processor" with a "Log Convertor" option. This is incorrect — `clp-s --schema-path` operates on JSONL input, not raw text. The implementation needs to be refactored: move the schema selector under JSON mode, change the label to "Schema", replace the "Log Convertor" default option with "Default", and update `applyClpSFields()` in `jobHelpers.ts` to send `schemaContent` regardless of the `unstructured` flag.


#### Prototyping Commands

**Command 1: Compress with `--experimental` and `--schema-path`** (CLI equivalent of what the worker does internally)
```bash
clp-s c --experimental \
  --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  --print-archive-stats \
  /tmp/compress-out /tmp/sample-500.jsonl
```

Output:
```
[info] total parsing time: 698 (0.000698)
[info] Var count: 619
[info] Log type count: 22
{"size":8740,"uncompressed_size":106988}
```

**Command 2: Compress without `--experimental` (baseline)**
```bash
clp-s c --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  --print-archive-stats /tmp/compress-noexp /tmp/sample-500.jsonl
```

This produces a standard (non-CLPP) archive without typed log dictionary, logtype_stats, logtype_metadata, schema_tree, or ls_schema sections.

**Command 3: Attempt compression with raw text input**
```bash
# Extract raw messages from JSONL
python3 -c "
import json
for line in open('/tmp/sample-500.jsonl'):
    print(json.loads(line)['message'], end='')
" > /tmp/sample-raw.log

clp-s c --experimental \
  --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  /tmp/compress-raw /tmp/sample-raw.log
```

Output:
```
terminate called after throwing an instance of 'clp_s::ErrorCodeFailed'
  what(): Direct ingestion of unstructured logtext is not supported
```

**Raw text ingestion is blocked.** The `JsonParser` rejects `FileType::LogText` (line 780–785 of `JsonParser.cpp`). Input must be JSON/JSONL. The compression form must either require JSON input or add a preprocessing step that wraps raw text as `{"message": "..."}`.

---

#### 8.3.2 Schema Library (Settings Page)

```
+-------------------------------------------------------------------------+
| Settings > Schema Library                                               |
+-------------------------------------------------------------------------+
|                                                                         |
| Saved Schemas:                                                          |
| +----------------------------------------------------------+           |
| | Name            | Rules | Type Mapping       | Actions   |           |
| |-----------------|-------|--------------------|-----------|           |
| | hadoop-default  | 4     | int→Integer        | [Edit] [Del] |      |
| | hadoop-detailed | 8     | int,fetcher_id,    | [Edit] [Del] |      |
| |                 |       | job_id,byte_count   |            |           |
| |                 |       | → Integer           |            |           |
| +----------------------------------------------------------+           |
|                                                                         |
| [+ New Schema]  [Import from file]                                      |
|                                                                         |
| +--Schema Editor (SchemaDialog)-----------------------------------------------+       |
| | Name: [hadoop-detailed]                                       |       |
| |                                                                |      |
| | delimiters: \t\r\n !"#%&'()*,:;<>?@[]^_`{}|~                 |      |
| |                                                                |      |
| | int:-?\d+                                                      |      |
| | float:-?\d+\.\d+                                             |      |
| | fetcher_id:fetcher#\d+                                        |      |
| | job_id:job_\d+_\d+                                            |      |
| | attempt_id:attempt_\d+_\d+_m_\d+_\d+                           |      |
| | byte_count:\d+                                                |      |
| |                                                                |      |
| | Rule Name → Type Mapping: (controls cIntSet behavior)          |      |
| | +------------------------------------------------------+      |      |
| | | Rule Name    | Column Type  | In cIntSet? |          |      |      |
| | | int          | Integer      | Yes         |          |      |      |
| | | float        | Float        | No (cFloat) |          |      |      |
| | | fetcher_id   | Integer      | Yes [+]     |          |      |      |
| | | job_id       | Integer      | Yes [+]     |          |      |      |
| | | attempt_id   | Integer      | Yes [+]     |          |      |      |
| | | byte_count   | Integer      | Yes [+]     |          |      |      |
| | +------------------------------------------------------+      |      |
| |                                                                |      |
| | [Validate with sample] [Save] [Cancel]                         |      |
| +---------------------------------------------------------------+       |
+-------------------------------------------------------------------------+
```

**Shared SchemaMonacoEditor component:** The `SchemaMonacoEditor` at `features/clpp/components/schema-monaco-editor/` is a reusable Monaco editor component used in both the Settings SchemaDialog (above) and the compression form's JSON-mode Schema dropdown. It uses a local `monaco-loader` to bundle Monaco instead of using CDN, following the same pattern as the existing `SqlEditor` component. This ensures a consistent schema editing experience across the application.

**Saved schema selector (Select dropdown):** The compression form uses a Select dropdown under JSON mode to choose from saved schemas fetched via `/api/schemas`, or to select "Default" (no schema) or "Custom" (write schema text from scratch). This replaces the previous "Unstructured logs processor" / "Log Convertor" dropdown which was incorrectly placed under Text mode.

**Real data mapping:** The "In cIntSet?" column makes the hardcoded `cIntSet` in `JsonParser.cpp` configurable. Currently `cIntSet` contains: `int, blk_id, containerSeq, portNum, memory, vcores, pid, blockID, exitStatus`. With the editor, users can add `fetcher_id`, `job_id`, `attempt_id`, `byte_count` to the set, producing unique `Integer` nodes per variable instead of the shared `Integer("int")` trap.


#### Prototyping Commands

No binary command directly tests the Schema Library UI feature — it is a WebUI-only feature for managing schema files. However, the relationship between schema rules and CLPP behavior can be demonstrated:

**Command: Show which schema rule names map to which column types**
```python
# From JsonParser.cpp — hardcoded type mappings
cIntSet = {'int', 'blk_id', 'containerSeq', 'portNum', 'memory',
           'vcores', 'pid', 'blockID', 'exitStatus',
           'fetcherID', 'launcher_number', 'line_number',
           'used_memory_size', 'num_vcores', 'size',
           'blk_id', 'blk_gen', 'port', 'mapAttempts'}
cFloatSet = {'float'}

# All other rule names default to String type
print(f"cIntSet: {len(cIntSet)} rules → Integer columns")
print(f"cFloatSet: {len(cFloatSet)} rules → Float columns")
print(f"Remaining: {total_rules - len(cIntSet) - len(cFloatSet)} → String columns")
```

The Schema Editor UI would make these hardcoded sets configurable, allowing users to add rules like `byte_count` to `cIntSet` instead of falling back to the generic `INT` shared node. Currently, rules not in `cIntSet`/`cFloatSet` that match numeric patterns (like `HAS_NUMBER`) become `ClpString` nodes, while unnamed integers become `Integer("INT")` — the shared node that causes the deduplication trap.

---

### 8.4 Experimental Mode Toggle

```
+-------------------------------------------------------------------------+
| Settings > General                                                       |
+-------------------------------------------------------------------------+
|                                                                         |
| Experimental Mode (CLPP): [===O        ]  ON                          |
|                                                                         |
| When OFF:                                                               |
|   - Schema selector hidden on Compress form (JSON mode always shown,   |
|     but schema dropdown defaults to "Default" with no schemaContent)    |
|   - Logtype Fields section hidden in Explore sidebar                    |
|   - Patterns/Schema/Stats tabs hidden in Explore                       |
|   - Query Interpretation panel hidden                                  |
|   - CLPP filters unavailable in filter bar                            |
|   - Search uses standard ClpString wildcard (no decomposition)         |
|   - Compression jobs send schemaContent: null (no --experimental flag)  |
|                                                                         |
| When ON:                                                                |
|   - All CLPP features visible                                           |
|   - Compression form shows schema selector under JSON mode             |
|     (Default / Custom / saved schemas) + SchemaMonacoEditor            |
|   - Compression jobs send schemaContent: <schema text>                  |
|   - Worker automatically passes --experimental --schema-path <temp>     |
|   - Search uses CLPP decomposition path (prototype — may crash)        |
+-------------------------------------------------------------------------+
```

**Note: The WebUI never sends the `--experimental` flag.** The `--experimental` flag is never exposed or sent by the WebUI. Instead, the WebUI sends `schemaContent: string | null` in the compression job creation body. The server maps `body.schemaContent ?? null` to `schema_content` in `ClpIoConfig`. When `schema_content` is present, the Python worker automatically writes it to a temp file and appends `--experimental --schema-path <temp>` to the `clp-s` command. This abstraction simplifies the user experience: providing schema content is sufficient to enable CLPP mode.


#### Prototyping Commands

No specific binary command — this is a UI toggle. The effect is demonstrated by the presence/absence of `--experimental` in every `clp-s` command above. Without `--experimental`, CLPP archive sections (logtype_stats, logtype_metadata, schema_tree, ls_schema) are not written, and the typed variable dictionary is not used. In the WebUI, the toggle controls whether `schemaContent` is sent as a non-null value; the worker handles the `--experimental` flag automatically.

---

### 8.5 IngestPage — Archive Details Enhancement

```
+-------------------------------------------------------------------------+
| Archive Details                                                         |
+-------------------------------------------------------------------------+
| +------------------------------------------------------------------+   |
| | Archive | Time Range  | Size    | Msgs | Logtypes | Schema       |   |
| |---------|-------------|---------|------|----------|-------------|   |
| | 05b7f...| 500 msgs   | 8.5 KB  | 500  | 22       | hive-24hr-0426  |   |
| +------------------------------------------------------------------+   |
|                                                                         |
| v b73b3d1b (expanded)                                                  |
|   Top logtype: "INFO [fetcher#%int%]...Fetcher..." (48, 13.0%)         |
|   Shared nodes: 1 (message.int — 9 positions/record)                   |
|   Schema: hadoop-default (4 rules: delimiters, int, float, header)   |
|   Compression: 106,988 B → 8,740 B = 12.2x                              |
|   Archive sections:                                                     |
|     logtype_stats   52 B  | logtype_metadata  276 B                    |
|     schema_tree     460 B  | ls_schema        2,663 B                    |
+-------------------------------------------------------------------------+
```

**Real data mapping:** All numbers from actual binary output with the rich Hadoop schema. The `logtype_stats: 52 B` and `logtype_metadata: 276 B` are the actual file sizes. The `schema_tree: 460 B` is the compressed schema tree. The `ls_schema: 2,663 B` stores the full log-surgeon schema text.


#### Prototyping Commands

**Command 1: Archive stats from `--print-archive-stats` JSON**
```bash
clp-s c --experimental --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  --print-archive-stats /tmp/compress-out /tmp/sample-500.jsonl
```

JSON output:
```json
{"id":"05b7f8f4-02c1-474c-848a-00a5f67aea42","size":8740,"uncompressed_size":106988,
 "range_index":[{"e":500,"s":0}]}
```

**Command 2: CLPP-specific archive file sizes**
```bash
ls -la <archive_dir>/
```

Output (CLPP sections only):
```
logtype_stats      52 B   (compressed LogTypeStatArray)
logtype_metadata  276 B   (compressed LogTypeMetadataArray)
schema_tree       460 B   (compressed SchemaTree)
ls_schema        2663 B   (compressed log-surgeon schema text)
```

**Mapping:** The Archive Details enhancement adds CLPP columns (logtype count, schema name, shared nodes) and CLPP section sizes to the existing archive table. The logtype count (22) comes from the `logtype_stats` binary. The schema name comes from the `ls_schema` section (the stored schema text). The shared node analysis requires parsing the schema tree.

---

### 8.6 Dashboard Integration (Leveraging 2-clp)

#### 8.6.1 New Panel Types for Plugin Registry

Register in `builtin.ts` alongside the existing 9 panel types:

```
+-------------------------------------------------------------------------+
| [Panel: Logtype Statistics]                                   [v] [x]   |
+-------------------------------------------------------------------------+
| +--Query:-----------------------------------------------------+        |
| | Datasource: [CLP v]  Archive: [b73b3... v]                 |        |
| +---------------------------------------------------------------+       |
|                                                                         |
|    48 |██████████████████████████████████████ INFO Fetcher...           |
|    48 |██████████████████████████████████████ INFO Fetcher...           |
|    48 |██████████████████████████████████████ INFO InMemory...          |
|    48 |██████████████████████████████████████ INFO MergeMgr...          |
|     2 |██ INFO Merger...                                                |
+-------------------------------------------------------------------------+
```

```
+-------------------------------------------------------------------------+
| [Panel: Schema Tree]                                         [v] [x]   |
+-------------------------------------------------------------------------+
| v LogMessage [500]                                                      |
|   > LogType  > LogTypeID  > Timestamp                                  |
|   > Integer(int) [!]                                                    |
+-------------------------------------------------------------------------+
```

Plugin registry entries:

```typescript
{
    meta: {
        type: "logtype-stats",
        name: "Logtype Statistics",
        icon: "BarChart3",
        description: "Logtype occurrence counts and templates",
        defaultGridPos: {w: 6, h: 4},
        minGridPos: {w: 4, h: 3},
    },
    component: LazyLogtypeStatsPanel,
    defaultOptions: () => ({sortBy: "count", limit: 10}),
},
{
    meta: {
        type: "schema-tree",
        name: "Schema Tree",
        icon: "GitBranch",
        description: "CLPP schema tree visualization",
        defaultGridPos: {w: 4, h: 4},
        minGridPos: {w: 3, h: 3},
    },
    component: LazySchemaTreePanel,
    defaultOptions: () => ({expandDepth: 2}),
},
```


#### Prototyping Commands

No binary command — dashboard integration is a 2-clp WebUI feature. The data sources for dashboard panels (logtype stats, schema tree) are the same as sections 8.2.2 and 8.2.3. The panel types (`logtype-stats`, `schema-tree`) would be registered in `builtin.ts` alongside the existing 9 panel types, using the same plugin registry pattern.

---

### 8.7 Small / Supporting Features

#### 8.7.1 Wildcard-on-Numeric Indicator

```
+--Query Bar------------------------------------------------------+
| *1427088391284*                              [Search]  [i CLPP]  |
+------------------------------------------------------------------+
```

Hovering `[i CLPP]`: "Wildcard queries also match integer and float columns (e.g., `*1427088391284*` matches the job ID integer)."


#### Prototyping Commands

**Command: Attempt wildcard search that should match integer values**
```bash
clp-s s /tmp/compress-out "*1427088391284*" --experimental
```

Output:
```
terminate called after throwing an instance of 'std::out_of_range'
  what():  map::at
```

**Cannot demonstrate wildcard-on-numeric matching.** The search path crashes before `evaluate_numeric_wildcard_filter<T>()` is reached (see 8.2.5). The feature is implemented in `QueryRunner.cpp` — it converts integer/float column values to strings (`fmt::format("{:.17g}")` for doubles) and applies wildcard matching. The `[i CLPP]` indicator in the UI would note this behavior to users, but live demonstration requires the search crash to be fixed first.

---

#### 8.7.2 Logtype Template Highlighting in Results

Real decompressed record:
```json
{"message":{"timestamp":"2015-03-23 05:40:10","int":"913709",
 "log_type":"%header.timestamp%,%int% INFO [fetcher#%int%]..."}}
```

**Problem:** JSON deduplicates keys — when 9 integer variables all have key `"int"`, only the last value survives. The UI must read from the archive's schema + variable data directly, not from this JSON representation.

Proposed rendering in results table:
```
+-------------------------------------------------------------------------+
| timestamp            | message                                            |
|---------------------|---------------------------------------------------|
| 2015-03-23 05:40:10 | INFO [fetcher#2] org.apache...Fetcher:            |
|                     |          ^^^^    ^^^^^^^^                         |
|                     |        fetcher_id  (shared int position)          |
+-------------------------------------------------------------------------+
```

The variable portions are highlighted with their schema-qualified names, reconstructed from the schema tree + per-record schema (not from the lossy JSON output).


#### Prototyping Commands

**Command 1: Decompress archive and inspect JSON structure**
```bash
clp-s x --experimental /tmp/compress-out /tmp/decompress-out
head -1 /tmp/decompress-out/original | python3 -m json.tool
```

Output (record with 2 `%INT%` placeholders):
```json
{
  "message": {
    "logLevel": "INFO",
    "fetcherID": 3,
    "javaFQCN": "org.apache.hadoop.mapreduce.task.reduce.Fetcher",
    "attempt_id": "attempt_1427088391284_0027_m_000055_0",
    "INT": 384657,
    "to_state": "MEMORY",
    "log_type": " %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: fetcher#%fetcher_id.fetcherID% about to shuffle output of map %attempt_id% decomp: %INT% len: %INT% to %state_to.to_state%\n"
  }
}
```

**Critical observation:** The logtype template has 2 `%INT%` placeholders, but the JSON only has 1 `INT` key (value `384657`). The first INT value (`384653`, the "decomp" bytes) is **lost** due to JSON key deduplication. The UI must read from the archive's internal data structures (typed log dictionary + per-record schema with ordered variable positions), not from this JSON output.

**Command 2: Record with 3 INT placeholders (worse data loss)**
```bash
python3 -c "
import json
for line in open('/tmp/decompress-out/original'):
    obj = json.loads(line)
    lt = obj['message']['log_type']
    if lt.count('%INT%') == 3:
        print(json.dumps(obj, indent=2))
        break
"
```

Output:
```json
{
  "message": {
    "logLevel": "INFO",
    "fetcherID": 1,
    "javaFQCN": "org.apache.hadoop.mapreduce.task.reduce.MergeManagerImpl",
    "INT": 0,
    "used_memory_size": 1889612,
    "log_type": "...closeInMemoryFile -> map-output of size: %INT%, inMemoryMapOutputs.size() -> %INT%, commitMemory -> %INT%, usedMemory ->%used_memory.used_memory_size%\n"
  }
}
```

The template has 3 `%INT%` placeholders (map-output size, inMemoryMapOutputs count, commitMemory). JSON only preserves the last value (`0`). The first two values are **permanently lost** in JSON output.

---

#### 8.7.3 Search Metrics in Query Status

Real binary output:
```
[info] [stats] total messages searched: 0
[info] [stats] clps int filter check: 0
[info] [stats] clps float filter check: 0
[info] [stats] clps str filter check: 0
```

(The zeros are because no search was actually executed — just decompression.)

Proposed UI display:
```
Query Status: Done (1.2s) | 500 results | CLPP: 22 logtype checks | 0 int checks
```


#### Prototyping Commands

**Command: Observe `[stats]` lines from compression/decompression**
```bash
clp-s c --experimental --schema-path /home/junhao/samples/clps/hive-24hr-0426.txt \
  /tmp/compress-out /tmp/sample-500.jsonl
```

Output:
```
[info] [stats] total messages searched: 0
[info] [stats] clps int filter check: 0
[info] [stats] clps float filter check: 0
[info] [stats] clps str filter check: 0
```

**All zeros** — these metrics are only populated during search execution (`QueryRunner`), not during compression. To get non-zero values, the search path must work (currently crashes — see 8.2.5). The metrics track: `total_messages_searched` (from `GrepCore`), and per-type column check counts (`int_col_checks`, `float_col_checks`, `str_col_checks`). They are logged at program exit via `spdlog` as static counters.

---

#### 8.7.4 Schema Deduplication Trap Warning

```
+-------------------------------------------------------------------------+
| [!] Schema Warning: Shared Variable Node                                 |
+-------------------------------------------------------------------------+
|                                                                         |
| Node "message.INT" (Integer) is shared across up to 3 variable          |
| positions per record. A query "message.INT: 384657" matches            |
| if ANY of these positions equals that value — you cannot target a       |
| specific position (e.g., "only the decomp bytes field").               |
|                                                                         |
| 3 logtypes with shared INT positions (covering 158 records),           |
| 4 logtypes with shared fetcherID (covering 340 records):              |
|                                                                         |
|   #6: closeInMemoryFile -> map-output of size: %INT%,                  |
|       inMemoryMapOutputs.size() -> %INT%, commitMemory -> %INT%        |
|       ~~~~~~~~~~                       ~~~~~~~~~~     ~~~~~~~~~~        |
|       map-output size              in-mem count    commit memory        |
|                                                                         |
|   #0: ...decomp: %INT% len: %INT% to MEMORY                           |
|                   ~~~~~~     ~~~~~~                                     |
|                   decomp bytes  len bytes                                |
|                                                                         |
|   #1: assigned %INT% of %INT% to...                                     |
|                 ~~~~~    ~~~~~                                          |
|                 assigned count  total count                              |
|                                                                         |
|   fetcherID shared: [fetcher#%fetcherID%] ...fetcher#%fetcherID%...    |
|                     ~~~~~~~~              ~~~~~~~~                       |
|                     thread name           body reference                 |
|                                                                         |
| Fix: Add unique rule names to your schema:                              |
|   map_output_size:of size: \d+  → message.map_output_size (Integer)    |
|   in_mem_count:size\(\) -> \d+ → message.in_mem_count (Integer)         |
|   commit_memory:commitMemory -> \d+ → message.commit_memory (Integer)  |
|   decomp_bytes:decomp: \d+     → message.decomp_bytes (Integer)        |
|   len_bytes:len: \d+           → message.len_bytes (Integer)           |
|                                                                         |
| [Download improved schema]  [Dismiss]                                  |
+-------------------------------------------------------------------------+
```


#### Prototyping Commands

**Command: Count INT placeholders per logtype (detect shared nodes)**
```python
import json; from collections import Counter
lt_int = {}
for line in open('/tmp/decompress-out/original'):
    obj = json.loads(line)
    lt = obj['message']['log_type']
    n = lt.count('%INT%')
    lt_short = lt[:100]
    if lt_short not in lt_int or n > lt_int[lt_short]:
        lt_int[lt_short] = n
for lt, n in sorted(lt_int.items(), key=lambda x: -x[1]):
    if n > 0:
        print(f"  {n} INTs: {lt}")
```

Output:
```
  3 INTs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: closeInMemoryFile...
  2 INTs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: fetcher#%fetcher_id.fetcherID% abo...
  2 INTs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: assigned %INT% of %INT% to %nodePort...
  1 INTs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: Assigning %nodePort...
  1 INTs: %logLevel.logLevel% [EventFetcher...] %javaFQCN%: %attempt_id%: Got %INT% new map...
  1 INTs: %logLevel.logLevel% [main] %javaFQCN%: Scheduled snapshot period at %INT%...
```

**Also check fetcherID duplication:**
```python
# Same script but count %fetcher_id.fetcherID% instead of %INT%
```

Output:
```
  2 fetcherIDs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: fetcher#%fetcher_id.fetcherID%...
  2 fetcherIDs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: assigned %INT% of %INT% to...
  2 fetcherIDs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: Assigning %nodePort...
  2 fetcherIDs: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: %nodePort...
```

**Mapping:** `INT` is shared across up to 3 positions per record (closeInMemoryFile logtype: map-output size, inMemoryMapOutputs count, commitMemory). `fetcherID` is shared across 2 positions (thread name `fetcher#N` and body `fetcher#N`). With the rich schema, the deduplication problem is much less severe than with the minimal schema (which had 9 shared INT positions). The Schema Deduplication Warning UI would flag `INT` and `fetcherID` as shared nodes, and suggest adding more specific rule names (e.g., `map_output_size:map-output of size: \d+` to separate from the generic `INT`).

---

#### 8.7.5 Cross-Archive Logtype Diff

```
+-------------------------------------------------------------------------+
| Archive Comparison                                                      |
+-------------------------------------------------------------------------+
| Archive A: [b73b3... v]   Archive B: [select...]   [Compare]           |
|                                                                         |
| (Requires 2+ CLPP archives to compare. Currently only 1 exists.)       |
+-------------------------------------------------------------------------+
```

**API:**
```
GET /api/logtype-diff?archive_a=<id>&archive_b=<id>
```


#### Prototyping Commands

**Not demonstrated.** Cross-archive diff requires 2+ CLPP archives to compare. Currently only 1 archive exists in the prototyping environment. The feature would compare `logtype_stats` and `schema_tree` between archives to find logtypes present in one but not the other, or logtypes with significantly different occurrence counts. A second compression with different input data would be needed.

---

#### 8.7.6 Compression Ratio Simulator

```
+-------------------------------------------------------------------------+
| Compression Simulator                                                   |
+-------------------------------------------------------------------------+
|                                                                         |
| Current schema (70+ rules): 22 logtypes, 2 shared nodes (INT, fetcherID), 12.2x ratio     |
|                                                                         |
| Simulated schema (+5 rules):                                            |
|   +map_output_size, +in_mem_count, +commit_memory, +decomp_bytes,      |
|   +len_bytes                                                            |
|                                                                         |
| Estimated result: ~25 logtypes, 0 shared INT nodes, 1 shared fetcherID |
| (more logtypes = finer patterns = better variable dictionary compression)|
|                                                                         |
| [Apply simulated schema to Compression form]                            |
+-------------------------------------------------------------------------+
```


#### Prototyping Commands

**Not demonstrated.** The compression simulator requires running compression twice with different schemas and comparing results. This would need: (1) compress with current schema, (2) modify the schema (e.g., add `map_output_size:\d+` rule to eliminate `INT` shared node), (3) compress again with modified schema, (4) compare logtype counts and compression ratios. The `clp-s` binary does not support schema modification or simulation — this is a WebUI-only feature that would require a backend API to re-compress with a trial schema.

---

#### 8.7.7 Log Message Decomposition View

```
+-------------------------------------------------------------------------+
| Log Message Detail                                              [Close] |
+-------------------------------------------------------------------------+
| Raw:                                                                    |
| "2015-03-23 05:40:10,035 INFO [fetcher#2] ...Fetcher: fetcher#2      |
|  about to shuffle output of map attempt_1427088391284_0001_m_000021_0   |
|  decomp: 913705 len: 913709 to MEMORY"                                  |
|                                                                         |
| +--CLPP Decomposition------------------------------------------+       |
| |                                                                |      |
| | Logtype: %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%]  |      |
| |  %javaFQCN%: fetcher#%fetcher_id.fetcherID% about to shuffle  |      |
| |  output of map %attempt_id% decomp: %INT% len: %INT% to       |      |
| |  %state_to.to_state%                                           |      |
| |                                                                |      |
| | Variables:                                                     |      |
| | +-------------+-------------------------+--------+------+       |      |
| | | Name        | Value                   | Type   | Pos  |       |      |
| | |-------------|-------------------------|--------|------|       |      |
| | | logLevel    | INFO                    | String | 1    |       |      |
| | | fetcherID   | 3                       | Integer| 2    | [!]   |      |
| | | javaFQCN    | org...Fetcher           | String | 3    |       |      |
| | | fetcherID   | 3                       | Integer| 4    | [!]   |      |
| | | attempt_id  | attempt_1427088391284_  | String | 5    |       |      |
| | |             |   0027_m_000055_0       |        |      |       |      |
| | | INT         | 384653                  | Integer| 6    | [!]   |      |
| | | INT         | 384657                  | Integer| 7    | [!]   |      |
| | | to_state    | MEMORY                  | String | 8    |       |      |
| | +-------------+-------------------------+--------+------+       |      |
| |                                                                |      |
| | [!] fetcherID shared at positions 2 AND 4 (thread name + body)|      |
| | [!] INT shared at positions 6 AND 7 (decomp + len bytes)      |      |
| |     JSON output only shows INT=384657; value 384653 is LOST.   |      |
| +---------------------------------------------------------------+      |
+-------------------------------------------------------------------------+
```

**Real data mapping:** This view reads from the archive's internal data structures (typed log dictionary + per-record schemas with variable positions), NOT from the lossy JSON decompression which only preserves the last `"INT"` key value (`384657`). The first INT value (`384653`, the decomp bytes) is **lost** in JSON output. This is a critical implementation detail — the JSON output format is insufficient for this feature.


#### Prototyping Commands

**Command: Inspect a decomposed record with variable extraction**
```bash
head -1 /tmp/decompress-out/original | python3 -m json.tool
```

Output (with logtype template and variable values):
```json
{
  "message": {
    "logLevel": "INFO",
    "fetcherID": 3,
    "javaFQCN": "org.apache.hadoop.mapreduce.task.reduce.Fetcher",
    "attempt_id": "attempt_1427088391284_0027_m_000055_0",
    "INT": 384657,
    "to_state": "MEMORY",
    "log_type": " %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] %javaFQCN%: fetcher#%fetcher_id.fetcherID% about to shuffle output of map %attempt_id% decomp: %INT% len: %INT% to %state_to.to_state%\n"
  }
}
```

**Mapping the decomposition:** The logtype template `%logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] ...decomp: %INT% len: %INT% to %state_to.to_state%` has these variable positions:

| Position | Placeholder | JSON Key | Value | Problem |
|----------|-------------|----------|-------|---------|
| 1 | `%logLevel.logLevel%` | `logLevel` | INFO | OK |
| 2 | `%fetcher_id.fetcherID%` | `fetcherID` | 3 | OK |
| 3 | `%javaFQCN%` | `javaFQCN` | org...Fetcher | OK |
| 4 | `%fetcher_id.fetcherID%` | `fetcherID` | 3 | DUPLICATE KEY — same value (fetcher#3) |
| 5 | `%attempt_id%` | `attempt_id` | attempt_1427088391284_0027_m_000055_0 | OK |
| 6 | `%INT%` | `INT` | 384657 | LAST value only (len bytes) |
| 7 | `%INT%` | `INT` | 384653 | **LOST** — decomp bytes, overwritten by position 6 |

**Critical limitation:** The JSON output cannot reconstruct the full decomposition because: (a) `fetcherID` appears twice but JSON keeps only one value (both happen to be `3` here, so no data loss in this case), and (b) `INT` appears twice and only the last value survives. The UI must read from the archive's internal columnar storage where each variable position is stored separately, not from the lossy JSON.

---

### 8.8 Feature Priority Matrix

| Priority | Feature | Section | Dependencies | Notes |
|----------|---------|---------|-------------|-------|
| **P0** | Experimental Mode Toggle | 8.4 | None | Gates everything |
| **P0** | Compression Form: Schema Content | 8.3.1 | P0 toggle | Required to create CLPP archives; uses Monaco editor |
| **P0** | Schema Library + Editor | 8.3.2 | P0 schema content | Makes schema practical; exposes cIntSet |
| **P1** | Explore Page Patterns Tab | 8.2.2 | P0 + API | Highest user value |
| **P1** | Explore Page Schema Tab | 8.2.3 | P0 + API | Debugging + education |
| **P1** | Logtype Fields in Sidebar | 8.2.6 | P0 toggle | Enables CLPP filtering |
| **P1** | EXISTS Filters | 8.2.7 | P0 toggle | Extends search capabilities |
| **P1** | Archive Details Enhancement | 8.5 | P0 toggle | Shows CLPP data on IngestPage |
| **P2** | Query Interpretation Panel | 8.2.5 | P1 Patterns | Debugging/education; search must be fixed first |
| **P2** | Explore Page Stats Tab | 8.2.4 | P1 Patterns | Summary dashboard |
| **P2** | Search Metrics | 8.7.3 | P0 toggle | Small UI enhancement |
| **P2** | Wildcard-on-Numeric Indicator | 8.7.1 | P0 toggle | User education |
| **P2** | Logtype Template Highlighting | 8.7.2 | P1 Patterns + internal data access | Must read from archive, not JSON |
| **P2** | Schema Deduplication Warning | 8.7.4 | P1 Schema Tab | Actionable feedback |
| **P3** | Dashboard: Logtype Stats Panel | 8.6.1 | 2-clp dashboard + P1 | Leverages new dashboard |
| **P3** | Dashboard: Schema Tree Panel | 8.6.1 | 2-clp dashboard + P1 | Leverages new dashboard |
| **P3** | Cross-Archive Logtype Diff | 8.7.5 | P1 + 2+ archives | Requires multiple archives |
| **P3** | Compression Simulator | 8.7.6 | P1 Schema Tab | Educational tool |
| **P3** | Log Message Decomposition View | 8.7.7 | P1 + internal data access | Educational tool |

---

### 8.9 API Endpoints Summary

| Endpoint | Method | Purpose | Priority |
|----------|--------|---------|----------|
| `/api/logtype-stats` | GET | Per-logtype occurrence counts | P1 |
| `/api/logtype-values` | GET | Value distribution for a variable within a logtype | P1 |
| `/api/schema-tree` | GET | Schema tree nodes with types and counts | P1 |
| `/api/search/decompose` | GET | Query decomposition interpretations + metrics | P2 |
| `/api/logtype-diff` | GET | Cross-archive logtype comparison | P3 |
| `/api/schemas` | CRUD | Schema library management | P0 |
| `/api/compress` | POST | Add `schemaContent` field (replaces `experimental` + `schemaPath`) | P0 |

---

### 8.10 Implementation Notes

**Critical: JSON decompression is lossy for CLPP data.** The decompressed JSON output deduplicates keys — when a record has 9 integer variables all keyed `"int"`, only the last value survives. The UI must read from the archive's internal data structures (typed log dictionary + per-record schema with ordered variable positions) to correctly display all variable values. The current `SchemaReader::generate_log_message_template()` / `JsonSerializer` path produces the lossy JSON. A new serialization format (e.g., positional arrays: `"int": [035, 2, 2, 1427088391284, 0001, 000021, 0, 913705, 913709]`) or a dedicated API endpoint that reads the archive directly is needed.

**Search path is prototype-quality.** The `--experimental` search crashes with `std::out_of_range` in `map::at`. This must be fixed before any search-dependent features (Query Interpretation Panel, search metrics, EXISTS filters) can work. The crash likely occurs in `SchemaMatch::resolve_clpp_query()` or `QueryRunner::populate_string_queries()`.

**cIntSet/cFloatSet should be configurable.** Currently hardcoded in `JsonParser.cpp`. The Schema Editor (8.3.2) needs a backend API to write these mappings, and `JsonParser` needs to read them from the schema configuration instead of the hardcoded sets.

**Leveraging the 2-clp dashboard system:** The dashboard's plugin registry, 12-column grid, MySQL persistence, and Hono API are direct drop-in. CLPP panels (`logtype-stats`, `schema-tree`) register as new plugins. Existing panel types (stat, bar chart, table) can already visualize CLPP data via the new API endpoints.

**Leveraging PR #2169:** The S3 compression form fields are additive. The schema selector appears under JSON mode (not as a standalone section). The `CompressionJobCreationSchema` union type needs a `schemaContent` optional string field (replacing the previously proposed `experimental: boolean` + `schemaPath: string` fields). The server maps `body.schemaContent ?? null` to `schema_content` in `ClpIoConfig`. Note: `schemaContent` is sent regardless of the `unstructured` flag — the current `applyClpSFields()` logic that only sends `schemaContent` when `unstructured === true` is incorrect and must be fixed.

**No `--experimental` flag in the WebUI:** The `--experimental` flag is never exposed or sent by the WebUI. The WebUI simply sends `schemaContent: string | null`. When `schema_content` is present in the `ClpIoConfig`, the Python worker automatically writes it to a temp file and appends `--experimental --schema-path <temp>` to the `clp-s` command. This abstracts away the `--experimental` flag from the user — providing schema content is sufficient to enable CLPP mode.

**Combobox UI component:** The saved schema selector in the compression form uses a new `@/components/ui/combobox.tsx` that wraps `@base-ui/react/combobox`, following the same pattern as the existing Select component. This replaces the previously attempted cmdk-based Command component.

**SchemaMonacoEditor is a shared component:** The `SchemaMonacoEditor` at `features/clpp/components/schema-monaco-editor/` is reused in both the compression form (inside the JSON-mode Schema dropdown) and the Settings `SchemaDialog`. It uses a local `monaco-loader` to bundle Monaco instead of using CDN, following the same pattern as the existing `SqlEditor` component.

**Raw text ingestion is blocked.** `clp-s` rejects `FileType::LogText` with "Direct ingestion of unstructured logtext is not supported." The input must be JSON/JSONL. A pre-processing step (wrapping raw text in `{"message": "..."}` JSONL) is needed for the compression form, or the `JsonParser` needs to handle `LogText` files when `--experimental` is on.

---

---

## 9. Explore Page Redesign — Elastic Logs Explorer Pattern

This section redesigns the Explore page to match the interaction model of the [Elastic Logs Explorer](https://demo.elastic.co/app/observability-logs-explorer) (Kibana Discover). The current Explore page uses a custom field sidebar, an `AddFilterPopover` with EXISTS/NEXISTS types, and a basic `Table` component. The redesign replaces these with:

1. A **field browser sidebar** with hover "+" toggle (matching Elastic's `fieldToggle` behavior)
2. A **KQL-style query bar** with inline completion dropdown (replacing the `AddFilterPopover`)
3. A **shadcn `data-table`** (TanStack Table) for the Logs tab
4. A **data-table** for the Patterns tab with Count, Example, and Actions columns
5. The existing **schema tree** for the Field Statistics tab (kept as-is)

Reference implementation explored via `playwright-cli` on the Elastic demo (2025-05-15). Key findings:
- KQL completion: empty input → all field names; partial field → matching fields + syntax hints (`: equals some value`, `: * exists in any form`); `field:` → actual field values; `field:value` → `and`/`or` connectors
- Field toggle: `aria-label="Add field as column"`, clicking adds the field as a table column (reflected in URL state)
- Elastic shows ~50 fields in the Available Fields panel

---

### 9.1 Page Layout

```
+-----------------------------------------------------------------------------+
| [Dataset selector]  [============ KQL Query Bar ============] [Search]      |
+--------+--------------------------------------------------------------------+
|        |  [Logs]  [Patterns]  [Field Statistics]                            |
| Fields | +----------------------------------------------------------------+ |
| Filter | | Timestamp          | Body                                        | |
| [____] | |-------------------|---------------------------------------------| |
|        | | 2015-03-23 05:40  | INFO [fetcher#2] org...Fetcher: fetcher#2  | |
| SELECT | |                   | about to shuffle output of map attempt_... | |
| 2      | |-------------------|---------------------------------------------| |
| fields | | 2015-03-23 05:41  | INFO [fetcher#3] org...MergeManagerImpl:   | |
|        | |                   | closeInMemoryFile -> map-output of size...| |
| > ts   | |-------------------|---------------------------------------------| |
| > body | | ...              | ...                                         | |
|        | +----------------------------------------------------------------+ |
| AVAIL. |                                                                    |
| 75     |  500 results  |  Page 1 of 5  |  20 per page  ▼                    |
| fields |                                                                    |
|        |                                                                    |
| + logL |                                                                    |
| + javaF |                                                                    |
| + fetID |                                                                    |
| + atte  |                                                                    |
| ...    |                                                                    |
+--------+--------------------------------------------------------------------+
```

**Layout changes from current implementation:**
- **Field browser sidebar** (left, 240px): "Selected Fields" section on top, "Available Fields" section below. Each Available field row shows a "+" button on hover; clicking adds the field to "Selected Fields" and adds a column to the Logs table. Selected fields show a "×" button to remove.
- **Query bar** replaces `FilterBar` and `AddFilterPopover`. Single text input with KQL-style completion dropdown.
- **Logs tab** uses shadcn `data-table` (TanStack Table) with dynamic columns derived from `selectedFields`. Default columns: Timestamp, Body.
- **Patterns tab** uses shadcn `data-table` with Count, Example, Actions columns.
- **Field Statistics tab** keeps the current recursive schema tree with type badges and counts.

---

### 9.2 Available Fields Panel

```
+--------+
| Fields |
| [____] |  ← filter input (searches field names)
|        |
| SELECT |
| 2      |
| fields |
|        |
| × ts   |  ← selected: click × to remove from table + selected list
| × body  |  ← selected fields become table columns
|--------|
| AVAIL. |
| 75     |
| fields |
|        |
| + logLe|  ← hover shows blue "+" button; click to add column
|   Aa   |     type icon + field name + count
| + javaF|  ← logLevel: String, count 500
|   Aa   |
| + fID  |  ← fetcherID: Integer, count 340
|   #    |
| + attID|  ← attempt_id: String, count 120
|   Aa   |
| + INT  |  ← INT: Integer, count 158  [!]  (shared node warning)
|   # [!]|
| + toSt |  ← to_state: String, count 80
|   Aa   |
| ...    |     (scrollable, 75 total CLPP fields + 3 standard)
+--------+
```

**Behavior (matching Elastic):**
1. **Hover "+" button**: When the cursor hovers over an Available field row, a blue "+" button appears at the left edge of the row (matching Elastic's `fieldToggle` button with `aria-label="Add field as column"`). Clicking the "+" moves the field to "Selected Fields" and adds a corresponding column to the Logs table.
2. **"×" remove button**: Selected field rows show a "×" button. Clicking it removes the field from both "Selected Fields" and the Logs table columns.
3. **No log_types in the list**: Log type IDs (the numeric dictionary IDs) are NOT shown as field names — they are internal identifiers, not meaningful to users. Only schema tree variable names (e.g., `logLevel`, `fetcherID`, `attempt_id`, `INT`) appear in the Available Fields list.
4. **Field metadata**: Each field shows its type icon (`Aa` for string, `#` for int, `~` for float) and occurrence count. Shared nodes show a `[!]` warning badge (matching existing `WildcardOnNumericBadge` + shared-node indicator pattern).
5. **Standard fields**: Three always-present fields: `timestamp` (String), `service` (String), `level` (String). These are not from the schema tree — they are metadata fields on every log event.

**Data source**: The field list is built from the schema tree API (`GET /api/schema-tree?dataset=...`). The existing `flattenTree()` function in `field-browser.tsx` converts the hierarchical schema tree into a flat list of `FieldItem` objects. The only change is adding the hover "+" / "×" toggle behavior and removing the log_type entries.

**Implementation — hover "+" toggle:**
```tsx
// FieldRow addition: hover state for "+" button
const FieldRow = ({ field, isSelected, onToggleSelect }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isHovered && !isSelected && (
                <button
                    className="w-4 h-4 text-xs text-primary hover:text-primary/80"
                    onClick={() => onToggleSelect(field.name)}
                    aria-label="Add field as column"
                >
                    +
                </button>
            )}
            {isSelected && (
                <button
                    className="w-4 h-4 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => onToggleSelect(field.name)}
                    aria-label="Remove field from columns"
                >
                    ×
                </button>
            )}
            {/* ... type icon, field name, count ... */}
        </div>
    );
};
```

This matches the Elastic behavior where `data-test-subj="fieldToggle-{fieldName}"` appears on hover and toggles the field between selected/available states.

---

### 9.3 Logs Tab — Data Table

The Logs tab is rewritten using the shadcn `data-table` component (built on [TanStack Table](https://tanstack.com/table/v8)). This replaces the current basic `<Table>` component with a full-featured data table supporting sorting, pagination, and dynamic columns.

```
+------------------------------------------------------------------------+
| [Logs]  [Patterns]  [Field Statistics]                                 |
| +--------------------------------------------------------------------+ |
| |  Timestamp ▲    | Body                                        | ... | |
| |-----------------|---------------------------------------------|-----| |
| | 2015-03-23 05:4| INFO [fetcher#2] org...Fetcher: fetcher#2  |     | |
| |                 | about to shuffle output of map attempt_... |     | |
| |-----------------|---------------------------------------------|-----| |
| | 2015-03-23 05:4| INFO [fetcher#3] org...MergeManagerImpl:   |     | |
| |                 | closeInMemoryFile -> map-output of size... |     | |
| |-----------------|---------------------------------------------|-----| |
| | ...             | ...                                         |     | |
| +--------------------------------------------------------------------+ |
|                                                                        |
|  500 results  |  ◀ 1 2 3 4 5 ▶  |  20 per page ▼                      |
+------------------------------------------------------------------------+
```

**Column behavior:**
- **Default columns**: `Timestamp` + `Body` (always shown, not removable).
  - `Timestamp`: Renders the log event's timestamp. Sortable.
  - `Body`: Renders the full log event as JSONL with syntax highlighting (reusing existing `<SyntaxHighlight>` component). One row per event — no multi-line expansion. If the text overflows the cell, it truncates with ellipsis.
- **Dynamic columns**: For each field in `selectedFields` (beyond Timestamp and Body), a column is added. Column header = field name. Column cell = the field's value for that log event.
- **Column removal**: Clicking "×" on a selected field in the sidebar removes both the field from `selectedFields` and the column from the table.

**Data source**: Search results from the existing search API. The search endpoint returns log events as JSONL. Each event's fields are parsed client-side to extract column values.

**shadcn data-table setup:**
```bash
# Install TanStack Table + shadcn data-table
npx shadcn@latest add table
# The data-table component lives at:
#   src/components/ui/data-table.tsx
#   src/components/ui/data-table-pagination.tsx
#   src/components/ui/data-table-toolbar.tsx
# etc.
```

**Column definition (TanStack Table):**
```tsx
import { getCoreRowModel, useReactTable, flexRender } from "@tanstack/react-table";

const columns: ColumnDef<LogEvent>[] = [
    {
        accessorKey: "timestamp",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("timestamp")}</span>,
    },
    {
        accessorKey: "body",
        header: "Body",
        cell: ({ row }) => (
            <div className="truncate max-w-[600px]">
                <SyntaxHighlight code={row.original.body} />
            </div>
        ),
        enableSorting: false,
    },
    // Dynamic columns from selectedFields:
    ...selectedFields
        .filter(f => f !== "timestamp" && f !== "body")
        .map(field => ({
            accessorKey: field,
            header: field,
            cell: ({ row }: { row: Row<LogEvent> }) => (
                <span className="truncate text-xs">{row.getValue(field) ?? "—"}</span>
            ),
        })),
];
```

**Pagination**: Server-side pagination via the search API's `page` and `pageSize` query parameters. Default: 20 rows per page. TanStack Table's `PaginationState` controls the current page.

**Key differences from current implementation:**
1. **One row per log event** — the current implementation sometimes renders multi-line rows. The data-table enforces single-line rows with truncation.
2. **Dynamic columns** — columns are derived from `selectedFields` state, not hardcoded.
3. **Built-in sorting and pagination** — TanStack Table provides this out of the box, replacing manual implementation.
4. **Body column with syntax highlighting** — preserves the existing JSONL syntax highlighting but constrains it to a single line with truncation.

---

### 9.4 Patterns Tab — Data Table

The Patterns tab shows all log types in a data-table format. Currently it shows a simple table with expand/collapse rows. The redesign adds Count, Example, and Actions columns with richer interaction.

```
+------------------------------------------------------------------------+
| [Logs]  [Patterns]  [Field Statistics]                                 |
|                                                                        |
|  1,399 log types  |  500 total events                                 |
|  [Filter logtypes..._______________]                                   |
|                                                                        |
| +------+------------------------------------------+------------------+ |
| |Count | Example                                  | Actions          | |
| |------|------------------------------------------|------------------| |
| | 48   | INFO [fetcher#2] org...Fetcher: fetcher# | [+] [-] [▼ i]  | |
| |------|------------------------------------------|------------------| |
| | 48   | INFO [fetcher#3] org...MergeManagerImpl: | [+] [-] [▼ i]  | |
| |------|------------------------------------------|------------------| |
| | ...  | ...                                      | ...              | |
| +------+------------------------------------------+------------------+ |
|                                                                        |
|  ▼ Expanded row (after clicking [i]):                                 |
| +--------------------------------------------------------------------+ |
| | Tokens: logLevel, fetcherID, javaFQCN, attempt_id, INT, to_state  | |
| | Regex:  %logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%]      | |
| |        %javaFQCN%: fetcher#%fetcher_id.fetcherID% about to...    | |
| | Examples:                                                          | |
| |   1. INFO [fetcher#2] ...Fetcher: fetcher#2 about to shuffle... | |
| |   2. INFO [fetcher#3] ...Fetcher: fetcher#3 about to shuffle... | |
| |   3. INFO [fetcher#5] ...Fetcher: fetcher#5 about to shuffle... | |
| +--------------------------------------------------------------------+ |
|                                                                        |
|  ◀ 1 2 ... 70 ▶  |  20 per page ▼                                     |
+------------------------------------------------------------------------+
```

**Columns:**

| Column | Content | Behavior |
|--------|---------|----------|
| **Count** | Occurrence count from `logtype_stats` | Sortable (default: descending) |
| **Example** | One example log event rendered from the logtype template (with variable placeholders filled from a real record) | Truncated if too long |
| **Actions** | Three action buttons per row | See below |

**Action buttons:**

| Button | Action | Effect |
|--------|--------|--------|
| **[+]** | Add filter for this pattern | Inserts `logtype_id:<id>` into the query bar. Multiple patterns can be combined with `or`. Matching events are highlighted in the Logs tab. |
| **[-]** | Remove/exclude this pattern | Inserts `NOT logtype_id:<id>` into the query bar. Excludes matching events from results. |
| **[▼ i]** | Expand row details | Toggles the expanded section showing Tokens, Regex, and 3 Examples. The chevron rotates when expanded. |

**Expanded row content:**
- **Tokens**: List of variable/field names extracted from the logtype template (e.g., `logLevel`, `fetcherID`, `javaFQCN`). These correspond to schema tree leaf nodes.
- **Regex**: The logtype pattern string with `%qualified_name%` placeholders (e.g., `%logLevel.logLevel% [fetcher#%fetcher_id.fetcherID%] ...`). This is the "rule" that defines this log type.
- **Examples**: Up to 3 example log events matching this logtype. Rendered with syntax highlighting. These require a new API endpoint or client-side caching of search results grouped by logtype.

**Data sources:**
- Count: `GET /api/logtype-stats?dataset=...` — existing endpoint.
- Example/Examples: Requires either (a) a new API endpoint `GET /api/logtype-examples?dataset=...&logtype_id=<id>&count=3` or (b) client-side grouping of search results by `log_type` field.
- Tokens/Regex: Derivable from the logtype template string in `logtype_stats` response.

**Implementation — TanStack Table with expandable rows:**
```tsx
const columns: ColumnDef<LogtypeEntry>[] = [
    {
        accessorKey: "count",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Count" />,
        cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
        accessorKey: "example",
        header: "Example",
        cell: ({ row }) => (
            <span className="truncate max-w-[400px] text-xs font-mono">
                {row.original.example}
            </span>
        ),
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row, table }) => (
            <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => table.options.meta?.addPatternFilter(row.original.id)}>
                    +
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => table.options.meta?.removePatternFilter(row.original.id)}>
                    −
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6"
                    onClick={() => row.toggleExpanded()}>
                    {row.getIsExpanded() ? "▲" : "▼"}
                </Button>
            </div>
        ),
    },
];

// Expanded row renderer
const renderSubComponent = ({ row }: { row: Row<LogtypeEntry> }) => (
    <div className="ml-6 border-l px-4 py-2 text-xs space-y-2">
        <p><span className="font-semibold">Tokens:</span> {row.original.tokens.join(", ")}</p>
        <p><span className="font-semibold">Regex:</span> <code>{row.original.log_type}</code></p>
        <div>
            <span className="font-semibold">Examples:</span>
            <ol className="list-decimal ml-4 space-y-1">
                {row.original.examples.slice(0, 3).map((ex, i) => (
                    <li key={i}><SyntaxHighlight code={ex} /></li>
                ))}
            </ol>
        </div>
    </div>
);
```

**Key differences from current implementation:**
1. **Data-table** replaces the current basic `<Table>` with manual expand/collapse state.
2. **Count + Example + Actions** columns replace the current expand chevron + Logtype + Count layout.
3. **Action buttons** ([+], [-], [▼ i]) provide direct pattern-level filtering, replacing the need for the user to manually type logtype filters.
4. **Pagination** — 1,399 log types need pagination (20 per page = 70 pages). TanStack Table handles this.

---

### 9.5 Field Statistics Tab — Schema Tree

The Field Statistics tab keeps the current schema tree implementation from `schema-tab.tsx`. No changes needed — the existing recursive `Collapsible` tree with type badges and occurrence counts in parentheses already matches the requirement.

```
+------------------------------------------------------------------------+
| [Logs]  [Patterns]  [Field Statistics]                                 |
|                                                                        |
|  [Filter fields..._______________]                                     |
|                                                                        |
|  ▼ LogMessage (500)                                                    |
|    ▼ LogType (500)                                                      |
|      ▸ LogTypeID (500)                                                 |
|      ▸ Timestamp (500)                                                 |
|    ▸ Integer — int (500)  [!]                                          |
|    ▸ String — logLevel (500)                                           |
|    ▸ String — javaFQCN (500)                                           |
|    ▸ Integer — fetcherID (340)                                         |
|    ...                                                                 |
+------------------------------------------------------------------------+
```

**Requirement confirmed**: Occurrence counts are shown in parentheses after each node name (e.g., `(500)`, `(340)`), which is already the current behavior via `node.count`.

---

### 9.6 Query Input Bar — KQL-Style Completion

The `AddFilterPopover` (with EXISTS/NEXISTS/EQUALS/NOT_EQUALS types) and the current `FilterBar` are **removed**. They are replaced by a single KQL-style query input bar with inline completion dropdown, matching Elastic's KQL behavior.

```
+------------------------------------------------------------------------+
| [============ query bar with completion dropdown ============] [Search] |
+------------------------------------------------------------------------+
                                                                          |
   When input is empty (focus active):                                    |
   +--------------------------------------------------------------------+ |
   | @timestamp                                                        | |
   | @message                                                          | |
   | logLevel                                                          | |
   | fetcherID                                                         | |
   | javaFQCN                                                          | |
   | attempt_id                                                        | |
   | INT                                                               | |
   | to_state                                                          | |
   +--------------------------------------------------------------------+ |
                                                                          |
   When "logLevel" is typed:                                             |
   +--------------------------------------------------------------------+ |
   | logLevel  :  equals some value                                    | |
   | logLevel  :*  exists in any form                                  | |
   +--------------------------------------------------------------------+ |
                                                                          |
   When "logLevel:" is typed:                                            |
   +--------------------------------------------------------------------+ |
   | INFO                                                               | |
   | WARN                                                               | |
   | ERROR                                                               | |
   | DEBUG                                                               | |
   +--------------------------------------------------------------------+ |
                                                                          |
   When "logLevel: INFO " is typed (trailing space):                     |
   +--------------------------------------------------------------------+ |
   | and                                                                | |
   | or                                                                 | |
   +--------------------------------------------------------------------+ |
                                                                          |
   When "logLevel: INFO and " is typed:                                  |
   +--------------------------------------------------------------------+ |
   | @timestamp                                                        | |
   | @message                                                          | |
   | fetcherID                                                         | |
   | ... (all field names again)                                       | |
   +--------------------------------------------------------------------+ |
                                                                          |
   Applied filters shown as inline chips inside the input:               |
   +--------------------------------------------------------------------+ |
   | [logLevel: INFO ×] [fetcherID: 2 ×] and  |cursor|                 | |
   +--------------------------------------------------------------------+ |
                                                                          |
   Or as parsed summary below the input:                                  |
   +--------------------------------------------------------------------+ |
   | logLevel: INFO  AND  fetcherID: 2                       [Clear]    | |
   +--------------------------------------------------------------------+ |
+------------------------------------------------------------------------+
```

**Completion state machine:**

```
                    ┌──────────────┐
                    │  Empty input │
                    │ (focus active)│
                    └──────┬───────┘
                           │
                    Show all field names
                           │
                    ┌──────▼───────┐
                    │ Field prefix │ ← user types "logLe"
                    └──────┬───────┘
                           │
                    Show matching fields
                    + syntax operators
                           │
               ┌───────────┼───────────┐
               │           │           │
        ┌──────▼──┐  ┌─────▼────┐  ┌───▼──────┐
        │ field:  │  │ field:* │  │ and / or │
        │ (value) │  │ (exists)│  │ (connect)│
        └──────┬──┘  └─────────┘  └───┬──────┘
               │                        │
        Show field values          Back to field list
        (from schema tree)         (after connector)
```

**Completion logic:**

1. **Empty input + focus** → show all field names (from schema tree + standard fields).
2. **Partial field name** (e.g., `"logLe"`) → show matching field names + syntax operators for the first match (e.g., `logLevel: equals some value`, `logLevel:* exists in any form`).
3. **Field name + `:`** (e.g., `"logLevel:"`) → show actual field values from the schema tree or a dedicated values API.
4. **Complete clause** (e.g., `"logLevel: INFO "`) → show connectors: `and`, `or`.
5. **After connector** (e.g., `"logLevel: INFO and "`) → back to step 1 (show all field names).

**Query syntax (CLPP KQL):**

| Syntax | Meaning | Example |
|--------|---------|---------|
| `field: value` | Field equals value | `logLevel: INFO` |
| `field: *` | Field exists (any value) | `fetcherID: *` |
| `field: wild*card` | Wildcard match on field | `javaFQCN: Fetch*` |
| `<clause> and <clause>` | Both must match | `logLevel: INFO and fetcherID: 2` |
| `<clause> or <clause>` | Either must match | `logLevel: WARN or logLevel: ERROR` |
| `logtype_id: <id>` | Match specific log type (from Patterns [+]) | `logtype_id: 0` |
| `not <clause>` | Negation | `not logLevel: DEBUG` |

**Filter chips rendering:**
When the query is well-formed (e.g., `logLevel: INFO and fetcherID: 2`), the parsed clauses are rendered as inline chips or as a summary line below the input. Each chip shows the clause text and a "×" button that removes the clause from the query. This replaces the current `FilterBar` with its `Badge`-based filter chips.

**Data sources for completion:**
- **Field names**: From schema tree API (`GET /api/schema-tree`). Already available client-side via `flattenTree()`.
- **Field values**: New API endpoint `GET /api/field-values?dataset=...&field=<name>&limit=100` or derived client-side from schema tree node children / search result aggregation.
- **logtype_id values**: From `GET /api/logtype-stats?dataset=...`.

**Implementation — Completion dropdown:**
```tsx
const QueryBar = ({ dataset, fieldNames, onQuerySubmit }) => {
    const [query, setQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);

    const parseQueryContext = (text: string): QueryContext => {
        // Determine what completions are valid based on cursor position
        // and the current query text.
        const trimmed = text.trimEnd();

        if ("" === trimmed) {
            return { type: "field-list" };
        }

        if (trimmed.endsWith(":")) {
            return { type: "field-values", field: trimmed.slice(0, -1) };
        }

        if (trimmed.endsWith(" ") && isCompleteClause(trimmed)) {
            return { type: "connectors" };
        }

        // Partial field name
        const lastToken = trimmed.split(/\s+/).pop() ?? "";
        if (!lastToken.includes(":")) {
            return { type: "field-prefix", prefix: lastToken };
        }

        return { type: "none" };
    };

    const updateCompletions = (context: QueryContext) => {
        switch (context.type) {
            case "field-list":
            case "field-prefix":
                setCompletionItems(
                    fieldNames
                        .filter(f => "field-prefix" === context.type ?
                            f.startsWith(context.prefix) : true)
                        .map(f => ({ label: f, type: "field" as const }))
                );
                break;
            case "field-values":
                // Fetch from API or derive from schema tree
                setCompletionItems(
                    getValuesForField(context.field).map(v => ({
                        label: v,
                        type: "value" as const,
                    }))
                );
                break;
            case "connectors":
                setCompletionItems([
                    { label: "and", type: "operator" as const },
                    { label: "or", type: "operator" as const },
                ]);
                break;
        }
    };

    return (
        <Popover open={showDropdown} onOpenChange={setShowDropdown}>
            <PopoverTrigger asChild>
                <div className="relative flex-1">
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            const ctx = parseQueryContext(e.target.value);
                            updateCompletions(ctx);
                            setShowDropdown(true);
                        }}
                        onFocus={() => {
                            const ctx = parseQueryContext(query);
                            updateCompletions(ctx);
                            setShowDropdown(true);
                        }}
                        placeholder="Search logs... (e.g., logLevel: INFO and fetcherID: 2)"
                        className="h-9 text-sm"
                    />
                </div>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <Command>
                    <CommandList>
                        {completionItems.map((item) => (
                            <CommandItem
                                key={item.label}
                                onSelect={() => applyCompletion(item)}
                                className="text-xs"
                            >
                                {item.label}
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
```

**What gets removed:**
- `filter-bar.tsx` — the entire `AddFilterPopover` component and `FilterBar` component are deleted.
- `FilterType` enum (`EXISTS`, `NEXISTS`, `EQUALS`, `NOT_EQUALS`) — replaced by KQL syntax (`field: *` for exists, `field: value` for equals).
- The `filters` state in `ExplorePage/index.tsx` — replaced by a single `queryString` state.

---

### 9.7 Implementation Details

#### 9.7.1 shadcn Data Table Setup

The shadcn `data-table` component is built on TanStack Table v8. Install and configure:

```bash
# 1. Install TanStack Table
npm install @tanstack/react-table

# 2. Add shadcn data-table component
npx shadcn@latest add table
# This adds src/components/ui/data-table.tsx and related files
```

The `data-table` component at `src/components/ui/data-table.tsx` provides:
- `DataTable` — main table wrapper with `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`
- `DataTableColumnHeader` — sortable column header with asc/desc/reset icons
- `DataTablePagination` — pagination controls (previous/next, page size selector, row count)
- `DataTableToolbar` — optional toolbar with search/filter input
- `DataTableViewOptions` — column visibility toggles

#### 9.7.2 File Changes

| File | Change | Priority |
|------|--------|----------|
| `features/clpp/components/field-browser.tsx` | Add hover "+" / "×" toggle to `FieldRow`. Remove log_type entries from field list. | P0 |
| `features/clpp/components/filter-bar.tsx` | **DELETE** — replaced by `query-bar.tsx` | P0 |
| `features/clpp/components/query-bar.tsx` | **NEW** — KQL-style query input with completion dropdown | P0 |
| `features/clpp/components/logs-data-table.tsx` | **NEW** — Logs tab using shadcn data-table with dynamic columns | P0 |
| `features/clpp/components/patterns-data-table.tsx` | **NEW** — Patterns tab using shadcn data-table with Count/Example/Actions | P0 |
| `features/clpp/components/patterns-tab.tsx` | **DELETE** — replaced by `patterns-data-table.tsx` | P0 |
| `features/clpp/components/schema-tab.tsx` | Keep as-is (already matches Field Statistics tab requirements) | — |
| `pages/ExplorePage/index.tsx` | Replace `filters` state with `queryString` state. Replace `FilterBar` with `QueryBar`. Replace Logs tab content with `LogsDataTable`. Replace Patterns tab with `PatternsDataTable`. | P0 |
| `components/ui/data-table.tsx` | **NEW** — shadcn data-table component (from `npx shadcn add table`) | P0 |
| `features/clpp/components/query-interpretation-panel.tsx` | Keep for now — becomes useful when search path is fixed | P2 |
| `features/clpp/types.ts` | Add `LogEvent` type for data-table rows, `LogtypeEntry` extension for `example`/`tokens`/`examples` fields | P0 |

#### 9.7.3 API Requirements

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `GET /api/schema-tree?dataset=...` | GET | Field names + types + counts for sidebar and completion | **Existing** |
| `GET /api/logtype-stats?dataset=...` | GET | Logtype counts + templates for Patterns tab | **Existing** |
| `GET /api/field-values?dataset=...&field=<name>&limit=100` | GET | Top values for a field (for KQL completion) | **NEW** — needed for `field:` completion |
| `GET /api/logtype-examples?dataset=...&logtype_id=<id>&count=3` | GET | Example log events for a logtype (for expanded Patterns rows) | **NEW** — needed for [i] expand |
| `GET /api/search?dataset=...&query=<kql>&page=1&pageSize=20` | GET | Paginated search results for Logs tab | **Existing** (may need pagination params) |

#### 9.7.4 KQL Query Parsing

The KQL-style query bar requires a client-side parser to:
1. **Determine completion context** — what completions to show based on cursor position and current text.
2. **Parse completed queries** — extract clauses for the search API.
3. **Render filter chips** — show parsed clauses as removable chips.

Parser grammar (simplified):
```
query     = clause ( ("and" | "or") clause )*
clause    = field ":" value
          | field ":*"
          | "not" clause
field     = identifier
value     = string | wildcard_pattern
identifier = [a-zA-Z_][a-zA-Z0-9_.]*
wildcard_pattern = ( identifier | "*" | "?" )+
```

The parser does NOT need to be a full AST — it just needs to identify the current completion context and extract clauses for the search API. A simple tokenizer + state machine is sufficient (no PEG/ANTLR needed).

---

### 9.8 Updated Priority Matrix

The redesigned Explore page changes the priority of several features:

| Priority | Feature | Section | Dependencies | Notes |
|----------|---------|---------|-------------|-------|
| **P0** | shadcn data-table setup + Logs tab rewrite | 9.3 | TanStack Table install | Foundation for both Logs and Patterns tabs |
| **P0** | Field browser hover "+" / "×" toggle | 9.2 | None | Core interaction pattern from Elastic |
| **P0** | KQL query bar with completion | 9.6 | Field names API | Replaces EXISTS filter popup |
| **P0** | Patterns tab data-table rewrite | 9.4 | data-table + logtype-examples API | Count/Example/Actions columns |
| **P1** | Field values API for KQL completion | 9.7.3 | Backend | Needed for `field:` value completion |
| **P1** | Logtype examples API for Patterns expand | 9.7.3 | Backend | Needed for [i] expand rows |
| **P2** | KQL `not` clause support | 9.6 | KQL parser | Negation syntax |
| **P2** | Query Interpretation Panel | 8.2.5 | Search path fixed | Low priority until search works |
| ~~P1~~ | ~~EXISTS Filters~~ | ~~8.2.7~~ | ~~P0 toggle~~ | **REMOVED** — replaced by KQL `field:*` syntax |

**Deleted features:**
- `AddFilterPopover` with EXISTS/NEXISTS/EQUALS/NOT_EQUALS — replaced by KQL query bar.
- `FilterBar` with `Badge` chips — replaced by inline KQL chips or parsed summary.
- `FilterType` enum — replaced by KQL syntax.

---

### 9.9 Migration Path

1. **Install TanStack Table** and add shadcn `data-table` component.
2. **Rewrite `field-browser.tsx`** — add hover "+" / "×" toggle, remove log_type entries. This is the smallest change and can be shipped independently.
3. **Create `query-bar.tsx`** — KQL input with completion dropdown. Delete `filter-bar.tsx`. Update `ExplorePage` to use `queryString` instead of `filters` array.
4. **Create `logs-data-table.tsx`** — Logs tab with TanStack Table, dynamic columns from `selectedFields`, default Timestamp + Body columns.
5. **Create `patterns-data-table.tsx`** — Patterns tab with Count/Example/Actions columns, expandable rows with Tokens/Regex/Examples.
6. **Add `field-values` API endpoint** — for KQL `field:` value completion.
7. **Add `logtype-examples` API endpoint** — for Patterns [i] expand rows.
8. **Update `ExplorePage/index.tsx`** — wire up all new components, remove old FilterBar/Filter state.

Each step is independently deployable. Steps 2-3 can be done in parallel. Step 4-5 can be done in parallel. Steps 6-7 are backend work that unblocks the full KQL and Patterns experience but are not blockers for the initial UI rewrite (completion can show field names only; Patterns can omit examples in the expanded row initially).

---

---
