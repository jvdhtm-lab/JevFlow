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
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    name: { title: 'Name', type: 'string', maxLength: 100, 'x-nullable': true },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    tool_type: {
      title: 'Tool type',
      type: 'string',
      enum: ['smtp_email', 'slack_channel', 'teams', 'whatsapp'],
      filterable: true,
    },
    target: {
      title: 'Target',
      description:
        'Email address, channel webhook URL or phone number (customer-provided).',
      type: 'string',
      maxLength: 500,
      minLength: 1,
    },
    config: { title: 'Config', type: 'object', 'x-nullable': true },
    is_active: { title: 'Is active', type: 'boolean', filterable: true },
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

  required: ['tool_type', 'target'],
};
