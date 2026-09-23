import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['EnginePreset'] | undefined => {
  return;
};

export const EnginePreset: ResourceObject = {
  baseUrl: '/engine-preset/',
  relatedurls: ['/engine-preset/', '/engine-preset/{id}/'],
  name: 'EnginePreset',
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
    preset_type: {
      title: 'Preset type',
      type: 'string',
      enum: [
        'route',
        'model-route',
        'tool-guard',
        'research',
        'completion',
        'custom',
      ],
      filterable: true,
    },
    model: {
      title: 'Model',
      type: 'string',
      maxLength: 100,
      minLength: 1,
      filterable: true,
    },
    config: { title: 'Config', type: 'object', 'x-nullable': true },
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
