import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['DecisionEdge'] | undefined => {
  return;
};

export const DecisionEdge: ResourceObject = {
  baseUrl: '/decision-edge/',
  relatedurls: ['/decision-edge/', '/decision-edge/{id}/'],
  name: 'DecisionEdge',
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
    source: {
      title: 'Source',
      type: 'integer',
      'x-vhrs-relatedResource': 'decisions.DecisionNode',
      filterable: true,
    },
    target: {
      title: 'Target',
      type: 'integer',
      'x-vhrs-relatedResource': 'decisions.DecisionNode',
      filterable: true,
    },
    label: {
      title: 'Label',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
      filterable: true,
    },
    condition: { title: 'Condition', type: 'object', 'x-nullable': true },
    priority: {
      title: 'Priority',
      type: 'integer',
      maximum: 2147483647,
      minimum: -2147483648,
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

  required: ['map', 'source', 'target'],
};
