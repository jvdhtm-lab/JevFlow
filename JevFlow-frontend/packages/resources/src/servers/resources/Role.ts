import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['Role'] | undefined => {
  return;
};

export const Role: ResourceObject = {
  baseUrl: '/role/',
  relatedurls: ['/role/', '/role/{id}/'],
  name: 'Role',
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
    title: {
      title: 'Title',
      type: 'string',
      maxLength: 30,
      minLength: 1,
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    user: {
      title: 'User',
      type: 'integer',
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
      sortable: true,
    },
    permission: {
      title: 'Permission',
      type: 'string',
      enum: ['R', 'W', 'RW', 'RWD'],
      'x-vhrs-sortable': true,
      filterable: true,
      sortable: true,
    },
    app: {
      title: 'App',
      type: 'integer',
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'identity_api.App',
      filterable: true,
      sortable: true,
    },
  },

  required: ['title', 'user', 'app'],
};
