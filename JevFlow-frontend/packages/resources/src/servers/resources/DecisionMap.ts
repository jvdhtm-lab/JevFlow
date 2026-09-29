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
      filterable: true,
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
    version: {
      title: 'Version',
      type: 'string',
      maxLength: 20,
      minLength: 1,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    is_active: {
      title: 'Is active',
      type: 'boolean',
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    layout: { title: 'Layout', type: 'object', 'x-nullable': true },
    spec_yaml: {
      title: 'Spec yaml',
      type: 'string',
      readOnly: true,
      minLength: 1,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    category: {
      title: 'Category',
      type: 'string',
      enum: ['webhook', 'manual', 'schedule', 'event'],
      'x-vhrs-sortable': true,
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
};
