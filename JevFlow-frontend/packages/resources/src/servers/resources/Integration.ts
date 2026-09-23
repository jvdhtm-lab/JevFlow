import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['Integration'] | undefined => {
  return;
};

export const Integration: ResourceObject = {
  baseUrl: '/integration/',
  relatedurls: ['/integration/', '/integration/{id}/'],
  name: 'Integration',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    name: {
      title: 'Name',
      type: 'string',
      maxLength: 100,
      'x-nullable': true,
      filterable: true,
    },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    purpose: {
      title: 'Purpose',
      type: 'string',
      enum: ['user_auth', 'action_trigger'],
      filterable: true,
    },
    integration_type: {
      title: 'Integration type',
      type: 'string',
      enum: [
        'jira',
        'github',
        'gitlab',
        'slack',
        'teams',
        'aws',
        'gcp',
        'azure_cloud',
        'codex',
        'openai_codex',
        'slack_app',
        'outlook',
        'generic_webhook',
      ],
      filterable: true,
    },
    base_url: {
      title: 'Base url',
      type: 'string',
      format: 'uri',
      maxLength: 500,
      'x-nullable': true,
    },
    connection_status: {
      title: 'Connection status',
      type: 'string',
      enum: ['connected', 'disconnected', 'error', 'pending'],
      filterable: true,
    },
    config: { title: 'Config', type: 'object', 'x-nullable': true },
    credentials_hint: {
      title: 'Credentials hint',
      type: 'string',
      maxLength: 500,
      'x-nullable': true,
    },
    owner: {
      title: 'Owner',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
    },
    last_sync_at: {
      title: 'Last sync at',
      type: 'string',
      format: 'date-time',
      'x-nullable': true,
    },
    last_error: { title: 'Last error', type: 'string', 'x-nullable': true },
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

  required: ['integration_type'],
};
