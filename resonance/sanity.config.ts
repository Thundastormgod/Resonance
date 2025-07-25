import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Resonance',

  projectId: 'tvi7xjbr',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // Our singleton type has a list item with a custom child
            S.listItem()
              .title('Site Settings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings'),
              ),
            S.divider(),
            // The rest of our document types
            ...S.documentTypeListItems().filter((listItem) => {
              const id = listItem.getId()
              return id ? !['siteSettings'].includes(id) : false
            }),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
