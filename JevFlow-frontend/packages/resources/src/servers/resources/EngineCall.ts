import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['EngineCall'] | undefined => {
  return;
};

export const EngineCall: ResourceObject = {
  baseUrl: '/engine-call/',
  relatedurls: ['/engine-call/', '/engine-call/{id}/'],
  name: 'EngineCall',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    name: { title: 'Name', type: 'string', maxLength: 100, 'x-nullable': true },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    preset: {
      title: 'Preset',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'jev_engine.EnginePreset',
      filterable: true,
    },
    map: {
      title: 'Map',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'decisions.DecisionMap',
      filterable: true,
    },
    state: { title: 'State', type: 'object', 'x-nullable': true },
    questions: { title: 'Questions', type: 'object', 'x-nullable': true },
    answers: { title: 'Answers', type: 'object', readOnly: true },
    latency_ms: { title: 'Latency ms', type: 'integer', readOnly: true },
    created_by: {
      title: 'Created by',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
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
