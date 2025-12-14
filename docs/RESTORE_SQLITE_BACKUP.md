# Restauration depuis Backup SQLite

## Backups Disponibles

Les backups SQLite sont créés automatiquement avant migration dans:

- **Backup binaire:** `prisma/dev.db.backup.<timestamp>`
- **Dump SQL:** `dumps/dev.db.<timestamp>.sql`

## Lister les Backups

```bash
# Lister tous les backups disponibles
node scripts/restore-sqlite-from-backup.mjs

# Ou manuellement
ls -lh prisma/dev.db.backup.*
ls -lh dumps/dev.db.*.sql
```

## Restaurer depuis Backup

### Option 1: Script Automatique (Recommandé)

```bash
# Lister les backups
node scripts/restore-sqlite-from-backup.mjs

# Restaurer un backup spécifique
node scripts/restore-sqlite-from-backup.mjs prisma/dev.db.backup.2025-12-14T14-30-00
```

### Option 2: Restauration Manuelle

#### Backup Binaire

```bash
# Restaurer depuis backup binaire
cp prisma/dev.db.backup.<timestamp> prisma/dev.db
```

#### Dump SQL

```bash
# Restaurer depuis dump SQL
sqlite3 prisma/dev.db < dumps/dev.db.<timestamp>.sql
```

## Vérification Post-Restauration

```bash
# Vérifier que la DB est restaurée
sqlite3 prisma/dev.db ".tables"

# Compter les enregistrements
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Project;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"
```

## Notes

- Le script de restauration crée automatiquement un backup de la DB actuelle avant restauration
- Les backups sont dans `.gitignore` (ne seront pas commités)
- Les dumps SQL sont dans `dumps/` (gitignored)

## Créer un Nouveau Backup

```bash
# Créer un backup avant toute opération risquée
node scripts/backup-sqlite.mjs
```
