# Importeurs Conversation Autopsy

## Formats pris en charge

- WhatsApp : `.txt`
- Snapchat : export `My Data` en `.zip` contenant des JSON
- Instagram : export de données en `.zip` ou JSON
- Telegram : export Telegram Desktop en `.json` ou `.zip`

Les exports de Snapchat, Instagram et Telegram peuvent changer de structure. Les importeurs utilisent donc des heuristiques et renvoient des `warnings`.

## Intégration

Dans `page.tsx` :

```ts
import { importConversationFile } from "./lib/importers/importer";

const result = await importConversationFile(file);

setMessages(result.messages);
```

Les messages sont normalisés en :

```ts
{
  date,
  sender,
  text,
  platform,
  conversation?,
  attachment?
}
```

Le moteur d'analyse existant peut ensuite travailler sur `date`, `sender` et `text` comme avant.

## Important

Snapchat indique officiellement que son export "My Data" arrive en ZIP et peut contenir notamment le Saved Chat History. citeturn0search1

Instagram fournit son téléchargement de données via Meta Accounts Center. citeturn0search0

Telegram permet l'export des chats depuis Telegram Desktop, notamment en JSON lisible par machine. citeturn0search2
