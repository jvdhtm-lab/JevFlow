import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['User'] | undefined => {
  return;
};

export const User: ResourceObject = {
  baseUrl: '/user/',
  relatedurls: ['/user/', '/user/{id}/'],
  name: 'User',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    username: {
      title: 'Username',
      description:
        'Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
      type: 'string',
      pattern: '^[\\w.@+-]+$',
      maxLength: 150,
      minLength: 1,
      filterable: true,
    },
    email: {
      title: 'Email',
      type: 'string',
      format: 'email',
      maxLength: 254,
      minLength: 1,
      filterable: true,
    },
    password: {
      title: 'Password',
      type: 'string',
      maxLength: 128,
      minLength: 1,
    },
    first_name: {
      title: 'First name',
      type: 'string',
      maxLength: 150,
      filterable: true,
    },
    last_name: {
      title: 'Last name',
      type: 'string',
      maxLength: 150,
      filterable: true,
    },
    account: {
      title: 'Account',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.Account',
      filterable: true,
    },
    auth_provider: {
      title: 'Auth provider',
      type: 'string',
      enum: ['local', 'google', 'github', 'x', 'outlook', 'slack'],
      filterable: true,
    },
    avatar_url: {
      title: 'Avatar url',
      type: 'string',
      format: 'uri',
      maxLength: 500,
      'x-nullable': true,
    },
    is_active: {
      title: 'Active',
      description:
        'Designates whether this user should be treated as active. Unselect this instead of deleting accounts.',
      type: 'boolean',
      filterable: true,
    },
    is_staff: {
      title: 'Staff status',
      description: 'Designates whether the user can log into this admin site.',
      type: 'boolean',
      filterable: true,
    },
    status: {
      title: 'Status',
      type: 'string',
      enum: ['activated', 'deactivated', 'pending', 'confirmed', 'archived'],
      filterable: true,
    },
  },

  required: ['username', 'email', 'password'],
};
