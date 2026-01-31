// أنواع بيانات الاعتماد لكل مزود سحابي

export interface BaseCredentials {
  provider: string;
  isValid?: boolean;
  lastValidated?: Date;
}

// Google Cloud
export interface GoogleCloudCredentials extends BaseCredentials {
  provider: 'google';
  authMethod: 'service_account' | 'oauth' | 'api_key';
  projectId: string;
  // Service Account
  serviceAccountJson?: string;
  privateKey?: string;
  clientEmail?: string;
  // OAuth
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  // API Key
  apiKey?: string;
}

export interface BigQueryConfig {
  credentials: GoogleCloudCredentials;
  dataset: string;
  query: string;
  location?: string;
  maxResults?: number;
}

export interface GoogleSheetsConfig {
  credentials: GoogleCloudCredentials;
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
}

export interface GoogleCloudStorageConfig {
  credentials: GoogleCloudCredentials;
  bucketName: string;
  objectPath: string;
  fileFormat: 'csv' | 'json' | 'parquet' | 'avro';
}

// AWS
export interface AWSCredentials extends BaseCredentials {
  provider: 'aws';
  authMethod: 'access_keys' | 'iam_role' | 'profile';
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region: string;
  profileName?: string;
  roleArn?: string;
}

export interface S3Config {
  credentials: AWSCredentials;
  bucketName: string;
  objectKey: string;
  fileFormat: 'csv' | 'json' | 'parquet';
}

export interface RedshiftConfig {
  credentials: AWSCredentials;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  query: string;
  ssl?: boolean;
}

// Azure
export interface AzureCredentials extends BaseCredentials {
  provider: 'azure';
  authMethod: 'connection_string' | 'sas_token' | 'service_principal' | 'managed_identity';
  // Connection String
  connectionString?: string;
  // SAS Token
  sasToken?: string;
  accountName?: string;
  // Service Principal
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  // Managed Identity
  useManagedIdentity?: boolean;
}

export interface AzureBlobConfig {
  credentials: AzureCredentials;
  containerName: string;
  blobPath: string;
  fileFormat: 'csv' | 'json' | 'parquet';
}

export interface AzureSQLConfig {
  credentials: AzureCredentials;
  server: string;
  database: string;
  username?: string;
  password?: string;
  query: string;
}

// Snowflake
export interface SnowflakeCredentials extends BaseCredentials {
  provider: 'snowflake';
  authMethod: 'password' | 'key_pair' | 'oauth' | 'sso';
  account: string;
  username: string;
  password?: string;
  privateKey?: string;
  privateKeyPassphrase?: string;
  oauthToken?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

export interface SnowflakeConfig {
  credentials: SnowflakeCredentials;
  query: string;
}

// Databricks
export interface DatabricksCredentials extends BaseCredentials {
  provider: 'databricks';
  authMethod: 'token' | 'oauth' | 'service_principal';
  workspaceUrl: string;
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface DatabricksConfig {
  credentials: DatabricksCredentials;
  catalogName?: string;
  schemaName?: string;
  tableName?: string;
  query?: string;
}

// Dropbox
export interface DropboxCredentials extends BaseCredentials {
  provider: 'dropbox';
  authMethod: 'access_token' | 'oauth';
  accessToken?: string;
  appKey?: string;
  appSecret?: string;
  refreshToken?: string;
}

export interface DropboxConfig {
  credentials: DropboxCredentials;
  filePath: string;
}

// OneDrive / SharePoint
export interface MicrosoftCredentials extends BaseCredentials {
  provider: 'microsoft';
  authMethod: 'oauth' | 'app_registration';
  clientId: string;
  clientSecret?: string;
  tenantId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface OneDriveConfig {
  credentials: MicrosoftCredentials;
  filePath: string;
  driveId?: string;
}

// MongoDB Atlas
export interface MongoDBCredentials extends BaseCredentials {
  provider: 'mongodb';
  authMethod: 'connection_string' | 'credentials';
  connectionString?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  authSource?: string;
  ssl?: boolean;
}

export interface MongoDBConfig {
  credentials: MongoDBCredentials;
  collection: string;
  query?: string;
  projection?: string;
  limit?: number;
}

// Firebase / Firestore
export interface FirebaseCredentials extends BaseCredentials {
  provider: 'firebase';
  authMethod: 'service_account' | 'web_config';
  projectId: string;
  serviceAccountJson?: string;
  apiKey?: string;
  authDomain?: string;
}

export interface FirestoreConfig {
  credentials: FirebaseCredentials;
  collectionPath: string;
  documentId?: string;
  query?: {
    field: string;
    operator: string;
    value: any;
  }[];
  limit?: number;
}

// Supabase
export interface SupabaseCredentials extends BaseCredentials {
  provider: 'supabase';
  projectUrl: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

export interface SupabaseConfig {
  credentials: SupabaseCredentials;
  tableName: string;
  query?: string;
  select?: string;
  filters?: { column: string; operator: string; value: any }[];
}

// اتحاد جميع أنواع بيانات الاعتماد
export type CloudCredentials =
  | GoogleCloudCredentials
  | AWSCredentials
  | AzureCredentials
  | SnowflakeCredentials
  | DatabricksCredentials
  | DropboxCredentials
  | MicrosoftCredentials
  | MongoDBCredentials
  | FirebaseCredentials
  | SupabaseCredentials;

// حالة الاتصال
export interface ConnectionStatus {
  isConnecting: boolean;
  isConnected: boolean;
  error?: string;
  lastConnected?: Date;
}

// نتيجة الاتصال
export interface ConnectionResult {
  success: boolean;
  message: string;
  data?: any[];
  columns?: string[];
  rowCount?: number;
  metadata?: Record<string, any>;
}
