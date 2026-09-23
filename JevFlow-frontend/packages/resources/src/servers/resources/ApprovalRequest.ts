import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['ApprovalRequest'] | undefined => {
  return;
};

export const ApprovalRequest: ResourceObject = {
  baseUrl: '/approval-request/',
  relatedurls: ['/approval-request/', '/approval-request/{id}/'],
  name: 'ApprovalRequest',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    name: { title: 'Name', type: 'string', maxLength: 100, 'x-nullable': true },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    map: {
      title: 'Map',
      type: 'integer',
      'x-vhrs-relatedResource': 'decisions.DecisionMap',
      filterable: true,
    },
    run: {
      title: 'Run',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'decisions.DecisionRun',
      filterable: true,
    },
    node_key: {
      title: 'Node key',
      type: 'string',
      maxLength: 50,
      minLength: 1,
    },
    approval_tool: {
      title: 'Approval tool',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'decisions.ApprovalTool',
    },
    token: {
      title: 'Token',
      type: 'string',
      readOnly: true,
      minLength: 1,
      filterable: true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['pending', 'approved', 'declined'],
      filterable: true,
    },
    payload: { title: 'Payload', type: 'object', 'x-nullable': true },
    decided_by: {
      title: 'Decided by',
      type: 'integer',
      readOnly: true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
    },
    decided_at: {
      title: 'Decided at',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
    review_url: { title: 'Review url', type: 'string', readOnly: true },
    account: {
      title: 'Account',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.Account',
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

  required: ['map', 'node_key'],
};
