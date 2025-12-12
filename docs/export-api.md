# Export API Documentation

## Overview

The Export API provides comprehensive data export functionality for the Recruitment CRM system. It supports multiple formats (JSON, CSV, Excel) with custom field selection and bulk data processing capabilities.

## Base URL

```
/api/export
```

## Authentication

All export endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Get Available Fields

Get a list of all available fields for each data type.

**Endpoint:** `GET /api/export/fields`

**Response:**
```json
{
  "success": true,
  "data": {
    "schools": ["id", "name", "country", "region", "schoolType", "website", "relationshipStatus", "createdAt", "updatedAt"],
    "contacts": ["id", "schoolId", "name", "email", "phone", "position", "isPrimary", "createdAt", "updatedAt"],
    "interactions": ["id", "schoolId", "contactMethod", "date", "notes", "followUpRequired", "followUpDate", "createdBy", "createdAt"],
    "partnerships": ["id", "schoolId", "mouStatus", "mouSignedDate", "mouExpiryDate", "referralCount", "eventsHeld", "createdAt", "updatedAt"],
    "preferences": ["id", "schoolId", "preferredContactMethod", "programsOfInterest", "bestContactTime", "timezone", "specialRequirements", "createdAt", "updatedAt"]
  }
}
```

### Export Schools

Export schools data with optional related information.

**Endpoint:** `POST /api/export/schools`

**Request Body:**
```json
{
  "format": "json|csv|excel",
  "fields": ["id", "name", "country", "region"],
  "includeContacts": true,
  "includeInteractions": false,
  "includePartnerships": true,
  "includePreferences": false,
  "batchSize": 1000,
  "schoolIds": ["uuid1", "uuid2"],
  "startDate": "2023-01-01T00:00:00Z",
  "endDate": "2023-12-31T23:59:59Z"
}
```

**Parameters:**
- `format` (required): Export format - "json", "csv", or "excel"
- `fields` (optional): Array of field names to include in export
- `includeContacts` (optional): Include related contact data
- `includeInteractions` (optional): Include related interaction data
- `includePartnerships` (optional): Include related partnership data
- `includePreferences` (optional): Include related preference data
- `batchSize` (optional): Batch size for large datasets (max 10,000)
- `schoolIds` (optional): Array of specific school IDs to export
- `startDate` (optional): Filter by creation date (start)
- `endDate` (optional): Filter by creation date (end)

**Response (JSON format):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "School Name",
      "country": "Taiwan",
      "region": "Taipei",
      "contacts": [...],
      "interactions": [...]
    }
  ],
  "metadata": {
    "totalRecords": 150,
    "exportedAt": "2023-12-10T12:00:00Z",
    "filename": "export-2023-12-10T12-00-00-000Z.json"
  }
}
```

**Response (CSV/Excel format):**
- Content-Type: `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="export-timestamp.csv"`
- Headers: `X-Total-Records`, `X-Export-Timestamp`

### Export Contacts

Export contacts data.

**Endpoint:** `POST /api/export/contacts`

**Request Body:** Same as schools export (excluding include options)

### Export Interactions

Export interactions data.

**Endpoint:** `POST /api/export/interactions`

**Request Body:** Same as schools export (excluding include options)

### Export Comprehensive Data

Export schools with all related data included.

**Endpoint:** `POST /api/export/comprehensive`

**Request Body:** Same as schools export (include options are automatically enabled)

## Export Formats

### JSON Format
- Human-readable JSON structure
- Preserves data types and nested objects
- Includes metadata about the export

### CSV Format
- Comma-separated values
- Automatic escaping of special characters
- Flattened structure for nested objects
- Compatible with Excel and other spreadsheet applications

### Excel Format
- Native Excel (.xlsx) format
- Auto-sized columns
- Supports complex data structures through flattening
- Preserves data types where possible

## Error Responses

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details",
    "timestamp": "2023-12-10T12:00:00Z"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Invalid request parameters
- `EXPORT_ERROR`: Error during export processing
- `UNAUTHORIZED`: Missing or invalid authentication
- `FIELDS_ERROR`: Error retrieving available fields

## Usage Examples

### Export All Schools as JSON
```bash
curl -X POST /api/export/schools \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"format": "json"}'
```

### Export Specific Schools with Contacts as CSV
```bash
curl -X POST /api/export/schools \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "fields": ["id", "name", "country", "region"],
    "includeContacts": true,
    "schoolIds": ["uuid1", "uuid2"]
  }'
```

### Export Large Dataset with Batching
```bash
curl -X POST /api/export/comprehensive \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "excel",
    "batchSize": 500
  }'
```

## Performance Considerations

- **Batch Processing**: Large datasets are automatically processed in batches to prevent memory issues
- **Field Selection**: Limiting fields reduces export size and processing time
- **Date Filtering**: Use date ranges to limit the dataset size
- **Format Choice**: JSON is fastest for API consumption, CSV for spreadsheet compatibility, Excel for rich formatting

## Data Integrity

The export service ensures:
- **Complete Data**: All requested data is included in the export
- **Consistent Formatting**: Data types and formats are preserved across export formats
- **Relationship Integrity**: Related data maintains proper associations
- **Error Handling**: Graceful handling of missing or invalid data