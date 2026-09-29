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
    slug: {
      title: 'Slug',
      type: 'string',
      format: 'slug',
      pattern: '^[-a-zA-Z0-9_]+$',
      maxLength: 50,
      minLength: 1,
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
    is_active: {
      title: 'Is active',
      type: 'boolean',
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
  },

  required: ['slug'],
};
