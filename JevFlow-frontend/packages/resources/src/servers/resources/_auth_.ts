import type { ResourceObject } from '../../types';
const mockType = (): any | undefined => {
  return;
};

export const _auth_: ResourceObject = {
  baseUrl: '/auth/',
  relatedurls: [
    '/auth/login/',
    '/auth/providers/',
    '/auth/social/',
    '/auth/logout/',
  ],
  name: '_auth_',
  type: mockType,
  fields: {
    email: {
      title: 'Email',
      type: 'string',
      format: 'email',
      minLength: 1,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    password: {
      title: 'Password',
      type: 'string',
      minLength: 1,
      'x-vhrs-sortable': true,
      sortable: true,
    },
    user: {
      title: 'User',
      type: 'integer',
      readOnly: true,
      'x-vhrs-sortable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      sortable: true,
    },
  },

  required: ['email', 'password'],
};
