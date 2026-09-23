import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['App'] | undefined => {
  return;
};

export const App: ResourceObject = {
  baseUrl: '/app/',
  relatedurls: ['/app/', '/app/{id}/'],
  name: 'App',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    title: {
      title: 'Title',
      type: 'string',
      maxLength: 30,
      minLength: 1,
      filterable: true,
    },
    pathUrl: { title: 'PathUrl', type: 'string', maxLength: 100, minLength: 1 },
    entity_name: {
      title: 'Entity name',
      type: 'string',
      maxLength: 100,
      minLength: 1,
      filterable: true,
    },
    is_global: { title: 'Is global', type: 'boolean', filterable: true },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
    },
  },

  required: ['title', 'pathUrl'],
};
