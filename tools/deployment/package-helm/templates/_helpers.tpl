{{/*
Expand the name of the chart.
*/}}
{{- define "clp-package.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "clp-package.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "clp-package.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "clp-package.labels" -}}
helm.sh/chart: {{ include "clp-package.chart" . }}
{{ include "clp-package.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "clp-package.selectorLabels" -}}
app.kubernetes.io/name: {{ include "clp-package.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Component-specific selector labels
*/}}
{{- define "clp-package.componentSelectorLabels" -}}
{{ include "clp-package.selectorLabels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "clp-package.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "clp-package.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database connection string
*/}}
{{- define "clp-package.databaseHost" -}}
{{- printf "%s-database" (include "clp-package.fullname" .) }}
{{- end }}

{{/*
Queue connection string
*/}}
{{- define "clp-package.queueHost" -}}
{{- printf "%s-queue" (include "clp-package.fullname" .) }}
{{- end }}

{{/*
Redis connection string
*/}}
{{- define "clp-package.redisHost" -}}
{{- printf "%s-redis" (include "clp-package.fullname" .) }}
{{- end }}

{{/*
Results cache connection string
*/}}
{{- define "clp-package.resultsCacheHost" -}}
{{- printf "%s-results-cache" (include "clp-package.fullname" .) }}
{{- end }}

{{/*
Query scheduler connection string
*/}}
{{- define "clp-package.querySchedulerHost" -}}
{{- printf "%s-query-scheduler" (include "clp-package.fullname" .) }}
{{- end }}

{{/*
Image name for CLP services
*/}}
{{- define "clp-package.image" -}}
{{- $tag := .Values.global.image.tag | default .Chart.AppVersion }}
{{- printf "%s:%s" .Values.global.image.repository $tag }}
{{- end }}

{{/*
Image pull policy
*/}}
{{- define "clp-package.imagePullPolicy" -}}
{{- .Values.global.image.pullPolicy | default "IfNotPresent" }}
{{- end }}

{{/*
Storage class
*/}}
{{- define "clp-package.storageClass" -}}
{{- if .Values.global.storageClass }}
storageClassName: {{ .Values.global.storageClass }}
{{- end }}
{{- end }}

{{/*
First party service security context
*/}}
{{- define "clp-package.firstPartySecurityContext" -}}
runAsUser: {{ .Values.global.firstPartyServiceUid }}
runAsGroup: {{ .Values.global.firstPartyServiceGid }}
fsGroup: {{ .Values.global.firstPartyServiceGid }}
{{- end }}

{{/*
Third party service security context
*/}}
{{- define "clp-package.thirdPartySecurityContext" -}}
runAsUser: {{ .Values.global.thirdPartyServiceUid }}
runAsGroup: {{ .Values.global.thirdPartyServiceGid }}
fsGroup: {{ .Values.global.thirdPartyServiceGid }}
{{- end }}
