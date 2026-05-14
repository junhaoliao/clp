import {
    Col,
    Form,
    Input,
    Row,
    Switch,
} from "antd";


const EXPERIMENTAL_TOOLTIP =
    "Enable CLPP experimental features: schema decomposition, logtype statistics, " +
    "and schema tree visualization. This passes --experimental to clp-s.";

const SCHEMA_PATH_TOOLTIP =
    "Path to a log-surgeon schema file. This passes --schema-path to clp-s.";

const SCHEMA_PATH_PLACEHOLDER = "/path/to/schema.txt";


/**
 * Renders CLPP-specific form items (experimental mode + schema path) for
 * compression job submission. Uses Ant Design to match the existing IngestPage style.
 *
 * @return
 */
const ClppSchemaFormItems = () => {
    return (
        <Row gutter={8}>
            <Col span={5}>
                <Form.Item
                    label={"Experimental"}
                    name={"experimental"}
                    tooltip={EXPERIMENTAL_TOOLTIP}
                    valuePropName={"checked"}
                >
                    <Switch/>
                </Form.Item>
            </Col>
            <Col span={19}>
                <Form.Item
                    label={"Schema Path"}
                    name={"schemaPath"}
                    tooltip={SCHEMA_PATH_TOOLTIP}
                >
                    <Input
                        placeholder={SCHEMA_PATH_PLACEHOLDER}/>
                </Form.Item>
            </Col>
        </Row>
    );
};


export default ClppSchemaFormItems;
