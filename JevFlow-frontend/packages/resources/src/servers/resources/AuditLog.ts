import type { Models, ResourceObject } from '../../types';

const mockType = (): Models['AuditLog'] | undefined => {
  return;
};

export const AuditLog: ResourceObject = {
  baseUrl: '/audit-log/',
  relatedurls: ['/audit-log/', '/audit-log/{id}/'],
  name: 'AuditLog',
  type: mockType,
  fields: {
    id: { title: 'ID', type: 'integer', readOnly: true, filterable: true },
    user: {
      title: 'User',
      type: 'integer',
      'x-nullable': true,
      'x-vhrs-relatedResource': 'identity_api.CustomUser',
      filterable: true,
    },
    action: {
      title: 'Action',
      type: 'string',
      enum: [
        'CREATE',
        'UPDATE',
        'DELETE',
        'VIEW',
        'LOGIN',
        'LOGOUT',
        'WEBHOOK',
        'DECISION',
      ],
      filterable: true,
    },
    model_name: {
      title: 'Model name',
      type: 'string',
      maxLength: 100,
      minLength: 1,
      filterable: true,
    },
    object_id: {
      title: 'Object id',
      type: 'integer',
      maximum: 2147483647,
      minimum: -2147483648,
      'x-nullable': true,
      filterable: true,
    },
    object_repr: {
      title: 'Object repr',
      type: 'string',
      maxLength: 200,
      'x-nullable': true,
      filterable: true,
    },
    changes: {
      title: 'Changes',
      description: 'Store before/after values as JSON',
      type: 'object',
      'x-nullable': true,
    },
    timestamp: {
      title: 'Timestamp',
      type: 'string',
      format: 'date-time',
      readOnly: true,
    },
    ip_address: {
      title: 'Ip address',
      type: 'string',
      minLength: 1,
      'x-nullable': true,
    },
    user_agent: { title: 'User agent', type: 'string', 'x-nullable': true },
  },

  required: ['action', 'model_name'],
};
