import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'adminUser',
  title: 'Admin User',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'passwordHash',
      title: 'Password Hash',
      type: 'string',
      hidden: true, // Never expose in Studio UI
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      options: {
        list: [
          { title: 'Admin (Full Access)', value: 'admin' },
          { title: 'Editor (Content Only)', value: 'editor' },
          { title: 'Viewer (Read Only)', value: 'viewer' },
        ],
      },
      initialValue: 'viewer',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'avatar',
      title: 'Avatar',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
      description: 'Deactivate to prevent login without deleting user',
    }),
    defineField({
      name: 'lastLogin',
      title: 'Last Login',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'refreshToken',
      title: 'Refresh Token',
      type: 'string',
      hidden: true, // Never expose
    }),
    defineField({
      name: 'tokenExpiry',
      title: 'Token Expiry',
      type: 'datetime',
      hidden: true,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'email',
      media: 'avatar',
      role: 'role',
      isActive: 'isActive',
    },
    prepare({ title, subtitle, media, role, isActive }) {
      const roleLabels: Record<string, string> = {
        admin: '👑 Admin',
        editor: '✏️ Editor',
        viewer: '👁️ Viewer',
      }
      return {
        title: `${title} ${!isActive ? '(Inactive)' : ''}`,
        subtitle: `${subtitle} • ${roleLabels[role] || role}`,
        media,
      }
    },
  },
})
