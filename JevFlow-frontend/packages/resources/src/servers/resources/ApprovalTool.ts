import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['ApprovalTool'] | undefined => {
  return;
};

export const ApprovalTool: ResourceObject = {
  baseUrl: '/approval-tool/',
  relatedurls: ['/approval-tool/', '/approval-tool/{id}/'],
  name: 'ApprovalTool',
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
    tool_type: {
      title: 'Tool type',
      type: 'string',
      enum: ['message', 'email'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    via: {
      title: 'Via',
      type: 'string',
      enum: ['integration', 'hook'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    webhook_endpoint: {
      title: 'Webhook endpoint',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'integrations.WebhookEndpoint',
      filterable: true,
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

  required: ['tool_type'],
};
