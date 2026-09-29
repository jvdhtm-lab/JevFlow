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
    id: {
      title: 'ID',
      type: 'integer',
      readOnly: true,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    name: {
      title: 'Name',
      type: 'string',
      maxLength: 100,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    description: {
      title: 'Description',
      type: 'string',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    integration: {
      title: 'Integration',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'integrations.Integration',
      filterable: true,
      sortable: true,
    },
    direction: {
      title: 'Direction',
      type: 'string',
      enum: ['in', 'out'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    event_type: {
      title: 'Event type',
      type: 'string',
      maxLength: 100,
      minLength: 1,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    payload: { title: 'Payload', type: 'object', 'x-nullable': true },
    result: {
      title: 'Result',
      type: 'string',
      enum: ['success', 'error', 'skipped'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    error_msg: {
      title: 'Error msg',
      type: 'string',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    duration_ms: {
      title: 'Duration ms',
      type: 'integer',
      maximum: 2147483647,
      minimum: -2147483648,
      'x-nullable': true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    created_date_time: {
      title: 'Created date time',
      type: 'string',
      format: 'date-time',
      readOnly: true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    updated_date_time: {
      title: 'Updated date time',
      type: 'string',
      format: 'date-time',
      readOnly: true,
      'x-vhrs-sortable': true,
      sortable: true,
    },
  },

  required: ['event_type'],
};
