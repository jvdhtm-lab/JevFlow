import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['DecisionNode'] | undefined => {
  return;
};

export const DecisionNode: ResourceObject = {
  baseUrl: '/decision-node/',
  relatedurls: ['/decision-node/', '/decision-node/{id}/'],
  name: 'DecisionNode',
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
    node_key: {
      title: 'Node key',
      type: 'string',
      maxLength: 50,
      minLength: 1,
      filterable: true,
    },
    node_type: {
      title: 'Node type',
      type: 'string',
      enum: [
        'trigger',
        'rule',
        'classification',
        'prioritization',
        'decision',
        'action',
        'branch',
        'approval',
      ],
      filterable: true,
    },
    title: {
      title: 'Title',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
      filterable: true,
    },
    config: { title: 'Config', type: 'object', 'x-nullable': true },
    position_x: { title: 'Position x', type: 'number' },
    position_y: { title: 'Position y', type: 'number' },
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

  required: ['map', 'node_key', 'node_type'],
};
