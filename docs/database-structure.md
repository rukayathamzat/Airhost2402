# Structure de la Base de Données Airhost

## Version: v0.1.0-db-harmonized (2025-03-04)

Ce document décrit la structure de la base de données utilisée dans les environnements de recette et production d'Airhost.

## Tables Principales

### profiles
- **id** (uuid, PK) : Identifiant unique du profil, lié à auth.users.id
- **email** (text) : Adresse email de l'utilisateur
- **first_name** (text) : Prénom de l'utilisateur
- **last_name** (text) : Nom de famille de l'utilisateur
- **avatar_url** (text) : URL de l'avatar de l'utilisateur
- **created_at** (timestamp) : Date de création du profil
- **updated_at** (timestamp) : Date de dernière mise à jour du profil

### hosts
- **id** (uuid, PK) : Identifiant unique de l'hôte
- **email** (text) : Adresse email de l'hôte
- **phone_number_id** (text) : Identifiant du numéro de téléphone WhatsApp
- **whatsapp_access_token** (text) : Token d'accès à l'API WhatsApp
- **created_at** (timestamp) : Date de création de l'hôte

### properties
- **id** (uuid, PK) : Identifiant unique de la propriété
- **host_id** (uuid, FK) : Référence à l'hôte propriétaire
- **name** (text) : Nom de la propriété
- **address** (text) : Adresse de la propriété
- **description** (text) : Description de la propriété
- **ai_instructions** (text) : Instructions pour l'IA
- **amenities** (jsonb) : Équipements disponibles
- **check_in_instructions** (text) : Instructions d'arrivée
- **house_rules** (text) : Règles de la maison
- **timezone** (text) : Fuseau horaire de la propriété
- **language** (text) : Langue principale utilisée
- **created_at** (timestamp) : Date de création
- **updated_at** (timestamp) : Date de dernière mise à jour

### conversations
- **id** (uuid, PK) : Identifiant unique de la conversation
- **property_id** (uuid, FK) : Référence à la propriété concernée
- **guest_number** (text) : Numéro de téléphone du client
- **unread_count** (integer) : Nombre de messages non lus
- **last_message** (text) : Dernier message de la conversation
- **last_message_at** (timestamp) : Date du dernier message
- **created_at** (timestamp) : Date de création de la conversation
- **guest_name** (text) : Nom du client
- **guest_phone** (text) : Numéro de téléphone du client (format différent)
- **check_in_date** (date) : Date d'arrivée
- **check_out_date** (date) : Date de départ
- **status** (text) : Statut de la conversation

### messages
- **id** (uuid, PK) : Identifiant unique du message
- **conversation_id** (uuid, FK) : Référence à la conversation
- **content** (text) : Contenu du message
- **type** (text) : Type de message
- **direction** (text) : Direction du message (entrant/sortant)
- **created_at** (timestamp) : Date de création du message
- **metadata** (jsonb) : Métadonnées additionnelles
- **template_id** (uuid, FK) : Référence au modèle utilisé
- **delivered_at** (timestamp) : Date de livraison
- **read_at** (timestamp) : Date de lecture
- **status** (text) : Statut du message

### templates
- **id** (uuid, PK) : Identifiant unique du modèle
- **host_id** (uuid, FK) : Référence à l'hôte propriétaire
- **name** (text) : Nom du modèle
- **language** (text) : Langue du modèle
- **content** (text) : Contenu du modèle
- **created_at** (timestamp) : Date de création
- **variables** (jsonb) : Variables utilisables dans le modèle
- **description** (text) : Description du modèle
- **updated_at** (timestamp) : Date de dernière mise à jour

### property_templates
- **id** (uuid, PK) : Identifiant unique de l'association
- **property_id** (uuid, FK) : Référence à la propriété
- **template_id** (uuid, FK) : Référence au modèle
- **custom_variables** (jsonb) : Variables personnalisées
- **is_active** (boolean) : Statut d'activation
- **created_at** (timestamp) : Date de création
- **updated_at** (timestamp) : Date de dernière mise à jour

### property_ai_configs
- **id** (uuid, PK) : Identifiant unique de la configuration
- **property_id** (uuid, FK) : Référence à la propriété
- **prompt_template** (text) : Modèle de prompt pour l'IA
- **context** (text) : Contexte pour l'IA
- **allowed_actions** (jsonb) : Actions autorisées pour l'IA
- **custom_instructions** (jsonb) : Instructions personnalisées
- **created_at** (timestamp) : Date de création
- **updated_at** (timestamp) : Date de dernière mise à jour

### whatsapp_config
- **id** (uuid, PK) : Identifiant unique de la configuration
- **phone_number_id** (text) : Identifiant du numéro de téléphone
- **token** (text) : Token d'accès
- **created_at** (timestamp) : Date de création
- **updated_at** (timestamp) : Date de dernière mise à jour

## Relations entre les Tables

- **profiles.id → auth.users.id** (FK)
- **properties.host_id → hosts.id** (FK)
- **conversations.property_id → properties.id** (FK)
- **messages.conversation_id → conversations.id** (FK)
- **messages.template_id → templates.id** (FK)
- **property_templates.property_id → properties.id** (FK)
- **property_templates.template_id → templates.id** (FK)
- **property_ai_configs.property_id → properties.id** (FK)
- **media.message_id → messages.id** (FK)
- **media.property_id → properties.id** (FK)

## Sécurité et Politiques RLS

Toutes les tables ont Row Level Security (RLS) activé avec les politiques suivantes :

### properties
```sql
CREATE POLICY "Properties belong to hosts" ON properties
FOR ALL TO public
USING (
    host_id IN (
        SELECT id FROM hosts WHERE email = auth.email()
    )
);
```

### conversations
```sql
CREATE POLICY "Conversations belong to hosts" ON conversations
FOR ALL TO public
USING (
    property_id IN (
        SELECT id FROM properties WHERE host_id IN (
            SELECT id FROM hosts WHERE email = auth.email()
        )
    )
);
```

### messages
```sql
CREATE POLICY "Messages belong to hosts" ON messages
FOR ALL TO public
USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE property_id IN (
            SELECT id FROM properties WHERE host_id IN (
                SELECT id FROM hosts WHERE email = auth.email()
            )
        )
    )
);
```

## Données de Test

Des données de test ont été créées dans les deux environnements :

- **Utilisateur de test** : sipoxot832@egvoo.com
  - ID dans auth.users : d46c726e-83d6-48c9-998f-2964c9527803
  - ID dans hosts : d2c9bb29-6f5a-45c6-ab93-ac8c22ec8eeb
- **Propriété** : "Loft Moderne Montmartre" (ID: f0e8bb59-214e-4dc7-a80f-406f89220cff)
- **Conversation** avec un client fictif (ID: 6fbd028e-2b1c-4351-bbd7-b0d070284a40)
- **5 messages** dans la conversation simulant un échange client-hôte
- **Configuration WhatsApp** avec des valeurs fictives (ID: 12b3d097-2015-4447-a4df-2163784f6af9)
- **Configuration AI** pour la propriété (ID: 2e888b3d-50b9-4da0-8902-055d4003ffd0)
- **3 modèles de message** (Bienvenue, Instructions d'arrivée, Rappel de départ)

## Modifications Importantes

### v0.1.0-db-harmonized (2025-03-04)
- Harmonisation des structures de tables entre les environnements de recette et production
- Activation de RLS sur toutes les tables
- Correction des politiques RLS pour utiliser l'email au lieu de l'ID utilisateur
- Suppression des propriétés dupliquées et nettoyage des données
- Ajout des colonnes manquantes dans les tables conversations et templates
