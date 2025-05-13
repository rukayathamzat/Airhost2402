# Edge Function: create-conversation

Cette fonction permet de créer une nouvelle conversation dans l'application Airhost via une requête HTTP.

## Fonctionnalités

- Création d'une nouvelle conversation entre un hôte et un invité
- Vérification de l'existence de la propriété
- Détection des conversations similaires existantes pour éviter les doublons
- Création automatique d'un message de bienvenue dans la conversation

## Utilisation

### Endpoint

```
POST https://[project-ref].supabase.co/functions/v1/create-conversation
```

### Headers requis

```
Content-Type: application/json
Authorization: Bearer <token> (JWT token pour authentification)
```

### Corps de la requête (JSON)

```json
{
  "host_id": "uuid-de-l-hote",
  "guest_name": "Nom de l'invité",
  "guest_phone": "+33612345678",
  "property_id": "uuid-de-la-propriete",
  "check_in_date": "2025-04-01",
  "check_out_date": "2025-04-05",
  "status": "active" // Optionnel, par défaut "active"
}
```

### Réponses

#### Succès (201 Created)

```json
{
  "message": "Conversation créée avec succès",
  "conversation": {
    "id": "uuid-de-la-conversation",
    "guest_name": "Nom de l'invité",
    "guest_phone": "+33612345678",
    "property_id": "uuid-de-la-propriete",
    "check_in_date": "2025-04-01",
    "check_out_date": "2025-04-05",
    "status": "active",
    "last_message_at": "2025-03-25T16:45:00.000Z",
    "created_at": "2025-03-25T16:45:00.000Z"
  }
}
```

#### Conversation similaire existe déjà (200 OK)

```json
{
  "message": "Une conversation similaire existe déjà",
  "conversation": {
    // Détails de la conversation existante
  }
}
```

#### Erreur (400 Bad Request, 404 Not Found, 500 Internal Server Error)

```json
{
  "error": "Message d'erreur détaillé"
}
```

## Variables d'environnement requises

- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service pour accéder à la base de données

## Déploiement

Pour déployer cette fonction, utilisez la commande suivante :

```bash
supabase functions deploy create-conversation --project-ref votre-reference-projet
```

## Utilisation avec cURL

```bash
curl -X POST 'https://[project-ref].supabase.co/functions/v1/create-conversation' \
  -H 'Authorization: Bearer votre-token-jwt' \
  -H 'Content-Type: application/json' \
  -d '{
    "host_id": "uuid-de-l-hote",
    "guest_name": "Nom de l'invité",
    "guest_phone": "+33612345678",
    "property_id": "uuid-de-la-propriete",
    "check_in_date": "2025-04-01",
    "check_out_date": "2025-04-05"
  }'
```

## Intégration dans d'autres systèmes

Cette API peut être appelée depuis n'importe quel système externe capable d'envoyer des requêtes HTTP POST, comme :
- Un CRM
- Un système de réservation
- Un site web externe
- Une application mobile
