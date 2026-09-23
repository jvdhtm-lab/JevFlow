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
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    title: {
      title: 'Title',
      type: 'string',
      maxLength: 30,
      minLength: 1,
      filterable: true,
    },
    user: {
      title: 'User',
      type: 'integer',
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
    },
    permission: {
      title: 'Permission',
      type: 'string',
      enum: ['R', 'W', 'RW', 'RWD'],
      filterable: true,
    },
    app: {
      title: 'App',
      type: 'integer',
      'x-vhrs-relatedResource': 'identity_api.App',
      filterable: true,
    },
    account: {
      title: 'Account',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.Account',
      filterable: true,
    },
  },

  required: ['title', 'user', 'app', 'account'],
};
