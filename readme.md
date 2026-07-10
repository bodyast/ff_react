INSTALL
```json
{
  "dependencies": {
    "@iqtechnology/ff-forms-react": "github:bodyast/ff_react"
  }
}
```

```bash
yarn add github:bodyast/ff_react
```

RUN PLAYGROUND
```bash
npm run playground -- --port 5174
```


```renderscript
<FFForm
  schema={schema}
  onFetchLookupList={async (listId) => {
    const response = await api.getLookupList(listId);
    return response.data; // Має повертати об'єкт з { data: { items: [...] } }
  }}
  // ... інші пропси
/>
```

```bash
git add . && git commit -m "feat: ..." && git tag v1.0.6 && git push origin main --tags
```