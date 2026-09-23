import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['DecisionMap'] | undefined => {
  return;
};

export const DecisionMap: ResourceObject = {
  baseUrl: '/decision-map/',
  relatedurls: ['/decision-map/', '/decision-map/{id}/'],
  name: 'DecisionMap',
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
      'x-nullable': true,
      'x-vhrs-relatedResource': 'integrations.Integration',
      filterable: true,
    },
    version: {
      title: 'Version',
      type: 'string',
      maxLength: 20,
      minLength: 1,
      filterable: true,
    },
    is_active: { title: 'Is active', type: 'boolean', filterable: true },
    layout: { title: 'Layout', type: 'object', 'x-nullable': true },
    spec_yaml: {
      title: 'Spec yaml',
      type: 'string',
      readOnly: true,
      minLength: 1,
    },
    trigger_source: {
      title: 'Trigger source',
      type: 'string',
      enum: ['webhook', 'manual', 'schedule', 'event'],
      filterable: true,
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
};
