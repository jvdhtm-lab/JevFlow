import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['SyncLog'] | undefined => {
  return;
};

export const SyncLog: ResourceObject = {
  baseUrl: '/sync-log/',
  relatedurls: ['/sync-log/', '/sync-log/{id}/'],
  name: 'SyncLog',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    name: { title: 'Name', type: 'string', maxLength: 100, 'x-nullable': true },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    integration: {
      title: 'Integration',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'integrations.Integration',
      filterable: true,
    },
    direction: {
      title: 'Direction',
      type: 'string',
      enum: ['in', 'out'],
      filterable: true,
    },
    event_type: {
      title: 'Event type',
      type: 'string',
      maxLength: 100,
      minLength: 1,
      filterable: true,
    },
    payload: { title: 'Payload', type: 'object', 'x-nullable': true },
    result: {
      title: 'Result',
      type: 'string',
      enum: ['success', 'error', 'skipped'],
      filterable: true,
    },
    error_msg: { title: 'Error msg', type: 'string', 'x-nullable': true },
    duration_ms: {
      title: 'Duration ms',
      type: 'integer',
      maximum: 2147483647,
      minimum: -2147483648,
      'x-nullable': true,
    },
    account: {
      title: 'Account',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.Account',
      filterable: true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      filterable: true,
    },
    created_date_time: {
      title: 'Created date time',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
    updated_date_time: {
      title: 'Updated date time',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
  },

  required: ['event_type'],
};
