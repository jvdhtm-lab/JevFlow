import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['Account'] | undefined => {
  return;
};

export const Account: ResourceObject = {
  baseUrl: '/account/',
  relatedurls: ['/account/', '/account/{id}/'],
  name: 'Account',
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
    slug: {
      title: 'Slug',
      type: 'string',
      format: 'slug',
      pattern: '^[-a-zA-Z0-9_]+$',
      maxLength: 50,
      minLength: 1,
      filterable: true,
    },
    description: { title: 'Description', type: 'string', 'x-nullable': true },
    is_active: { title: 'Is active', type: 'boolean', filterable: true },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      filterable: true,
    },
  },

  required: ['slug'],
};
