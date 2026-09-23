import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['WebhookEndpoint'] | undefined => {
  return;
};

export const WebhookEndpoint: ResourceObject = {
  baseUrl: '/webhook-endpoint/',
  relatedurls: ['/webhook-endpoint/', '/webhook-endpoint/{id}/'],
  name: 'WebhookEndpoint',
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
    integration: {
      title: 'Integration',
      type: 'integer',
      'x-vhrs-relatedResource': 'integrations.Integration',
      filterable: true,
    },
    integration_name: {
      title: 'Integration name',
      type: 'string',
      readOnly: true,
      minLength: 1,
    },
    integration_type: {
      title: 'Integration type',
      type: 'string',
      readOnly: true,
      minLength: 1,
    },
    integration_base_url: {
      title: 'Integration base url',
      type: 'string',
      readOnly: true,
      minLength: 1,
    },
    direction: {
      title: 'Direction',
      type: 'string',
      enum: ['inbound', 'outbound'],
      filterable: true,
    },
    secret: {
      title: 'Secret',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
    },
    source: {
      title: 'Source',
      type: 'string',
      enum: ['jira', 'github', 'ci', 'slack', 'teams', 'generic'],
      filterable: true,
    },
    target_path: {
      title: 'Target path',
      type: 'string',
      maxLength: 500,
      minLength: 1,
    },
    target_url: {
      title: 'Target url',
      type: 'string',
      format: 'uri',
      maxLength: 500,
      'x-nullable': true,
    },
    auth_scheme: {
      title: 'Auth scheme',
      type: 'string',
      enum: ['none', 'bearer', 'basic'],
    },
    auth_username: {
      title: 'Auth username',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
    },
    is_active: { title: 'Is active', type: 'boolean', filterable: true },
    last_received_at: {
      title: 'Last received at',
      type: 'string',
      format: 'date-time',
      'x-nullable': true,
    },
    inbound_url: { title: 'Inbound url', type: 'string', readOnly: true },
    outbound_url: { title: 'Outbound url', type: 'string', readOnly: true },
    auth_required: { title: 'Auth required', type: 'string', readOnly: true },
    outbound_auth: { title: 'Outbound auth', type: 'string', readOnly: true },
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
    auth_token: { title: 'Auth token', type: 'string' },
  },

  required: ['integration', 'target_path'],
};
