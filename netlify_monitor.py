#!/usr/bin/env python3
"""
Netlify Deployment Monitor
Un script pour surveiller automatiquement les déploiements Netlify et récupérer les logs.
"""

import json
import os
import requests
import time
import datetime
import sys
from pathlib import Path

# Chargement de la configuration MCP
CONFIG_PATH = "/Users/Alexandre/.codeium/windsurf/netlify_mcp_config.json"

def load_config():
    """Charge la configuration MCP Netlify."""
    try:
        with open(CONFIG_PATH, 'r') as f:
            config = json.load(f)
            return config.get("netlify_deployment_monitor", {})
    except Exception as e:
        print(f"Erreur lors du chargement de la configuration : {e}")
        return {}

def get_netlify_deployments(config):
    """Récupère les déploiements récents du site Netlify."""
    headers = {
        "Authorization": f"Bearer {config['api_token']}",
        "Content-Type": "application/json"
    }
    
    url = f"https://api.netlify.com/api/v1/sites/{config['site_id']}/deploys"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la récupération des déploiements : {e}")
        return []

def get_deployment_logs(config, deploy_id):
    """Récupère les logs d'un déploiement spécifique."""
    headers = {
        "Authorization": f"Bearer {config['api_token']}",
        "Content-Type": "application/json"
    }
    
    # Méthode 1: essayer d'obtenir les logs via l'API directe
    url = f"https://api.netlify.com/api/v1/deploys/{deploy_id}/logs"
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Méthode 1 échouée: {e}")
        pass  # Continuer avec la méthode alternative
    
    # Méthode 2: obtenir les détails du déploiement qui peuvent inclure l'URL des logs
    url = f"https://api.netlify.com/api/v1/deploys/{deploy_id}"
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        deploy_data = response.json()
        
        # Extraire des informations utiles
        build_log_url = deploy_data.get('log_access_attributes', {}).get('url')
        if build_log_url:
            print(f"URL des logs trouvée: {build_log_url}")
            # Les logs sont disponibles à cette URL, mais nécessitent une authentification spéciale
            # Retourner les infos pour que l'utilisateur puisse y accéder manuellement
            return [{
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"Logs disponibles manuellement à: {build_log_url}\n\nOuvrez cette URL dans votre navigateur pour voir les logs complets."
            }]
        
        # Récupérer d'autres informations utiles du déploiement
        deploy_info = [
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"Informations du déploiement:"
            },
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"ID: {deploy_data.get('id', 'N/A')}"
            },
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"État: {deploy_data.get('state', 'N/A')}"
            },
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"Branche: {deploy_data.get('branch', 'N/A')}"
            },
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"URL de déploiement: {deploy_data.get('deploy_url', 'N/A')}"
            },
            {
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"Message d'erreur: {deploy_data.get('error_message', 'N/A')}"
            }
        ]
        
        # Si nous avons un message d'erreur spécifique, l'ajouter aux logs
        error_message = deploy_data.get('error_message')
        if error_message:
            deploy_info.append({
                "timestamp": datetime.datetime.now().isoformat(),
                "message": f"Erreur: {error_message}"
            })
        
        return deploy_info
    except requests.exceptions.RequestException as e:
        print(f"Méthode 2 échouée: {e}")
        
    # Méthode 3: Récupérer les logs via le tableau de bord Netlify (simulation d'accès web)
    # Cette URL est accessible dans le navigateur, mais pas directement via l'API
    dashboard_url = f"https://app.netlify.com/sites/{config.get('site_name').replace('.netlify.app', '')}/deploys/{deploy_id}"
    
    return [{
        "timestamp": datetime.datetime.now().isoformat(),
        "message": f"Impossible de récupérer les logs automatiquement. \n\nVeuillez consulter le tableau de bord Netlify pour voir les logs complets: \n{dashboard_url}"
    }]

def save_logs_to_file(config, deploy_id, logs, status):
    """Sauvegarde les logs dans un fichier."""
    if not config.get("save_logs_to_file", False):
        return
    
    logs_dir = Path(config.get("logs_directory", "./netlify_logs"))
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{logs_dir}/deploy_{deploy_id}_{status}_{timestamp}.log"
    
    try:
        with open(filename, 'w') as f:
            f.write(f"Déploiement Netlify : {deploy_id}\n")
            f.write(f"Statut : {status}\n")
            f.write(f"Horodatage : {timestamp}\n")
            f.write(f"Site : {config.get('site_name', config.get('site_id'))}\n")
            f.write(f"URL du tableau de bord : https://app.netlify.com/sites/{config.get('site_name').replace('.netlify.app', '')}/deploys/{deploy_id}\n")
            f.write("="*50 + "\n\n")
            
            if logs:
                for log_entry in logs:
                    timestamp = log_entry.get('timestamp', 'N/A')
                    message = log_entry.get('message', '')
                    f.write(f"[{timestamp}] {message}\n")
            else:
                f.write("Aucun log disponible\n")
        
        print(f"Logs sauvegardés dans {filename}")
        return filename
    except Exception as e:
        print(f"Erreur lors de la sauvegarde des logs : {e}")
        return None

def notify_deployment_status(config, deployment, logs_file=None):
    """Notifie le statut du déploiement selon la configuration."""
    status = deployment.get("state", "unknown")
    deploy_id = deployment.get("id", "unknown")
    
    if status == "error" and config.get("notify_on_failure", True):
        print(f"⚠️ ÉCHEC DU DÉPLOIEMENT: {deploy_id}")
        print(f"Site: {config.get('site_name', config.get('site_id'))}")
        if logs_file:
            print(f"Logs disponibles dans: {logs_file}")
        return True
    
    if status == "ready" and config.get("notify_on_success", False):
        print(f"✅ DÉPLOIEMENT RÉUSSI: {deploy_id}")
        print(f"Site: {config.get('site_name', config.get('site_id'))}")
        if logs_file:
            print(f"Logs disponibles dans: {logs_file}")
        return True
    
    return False

def monitor_deployments():
    """Fonction principale pour surveiller les déploiements."""
    config = load_config()
    if not config:
        print("Configuration non trouvée. Veuillez vérifier le fichier de configuration.")
        return
    
    print(f"Surveillance des déploiements pour le site: {config.get('site_name', config.get('site_id'))}")
    
    # Récupérer les déploiements récents
    deployments = get_netlify_deployments(config)
    
    if not deployments:
        print("Aucun déploiement récent trouvé.")
        return
    
    # Trouver le déploiement le plus récent
    latest_deployment = deployments[0]  # Les déploiements sont triés par date
    deploy_id = latest_deployment.get("id", "")
    status = latest_deployment.get("state", "")
    context = latest_deployment.get("context", "")
    branch = latest_deployment.get("branch", "")
    
    print(f"Dernier déploiement: {deploy_id}")
    print(f"Statut: {status}")
    print(f"Contexte: {context}")
    print(f"Branche: {branch}")
    print(f"URL du tableau de bord: https://app.netlify.com/sites/{config.get('site_name').replace('.netlify.app', '')}/deploys/{deploy_id}")
    
    # Récupérer les logs automatiquement ou afficher un message pour accéder manuellement
    logs = None
    logs_file = None
    
    # Toujours récupérer les infos de déploiement
    print("Récupération des informations de déploiement...")
    logs = get_deployment_logs(config, deploy_id)
    logs_file = save_logs_to_file(config, deploy_id, logs, status)
    
    # Notifier selon la configuration
    notify_deployment_status(config, latest_deployment, logs_file)
    
    # Suggestion d'utilisation
    print("\nPour surveiller en continu, vous pouvez exécuter ce script régulièrement avec une tâche cron.")
    print("Exemple: */5 * * * * cd /Users/Alexandre/CascadeProjects/Airhost1702 && python3 netlify_monitor.py >> netlify_monitor.log 2>&1")

def main():
    """Fonction principale qui peut être appelée en ligne de commande ou importée."""
    # Vérifier les arguments de ligne de commande
    if len(sys.argv) > 1 and sys.argv[1] == "--watch":
        # Mode surveillance continue
        try:
            interval = 60  # intervalle par défaut en secondes
            if len(sys.argv) > 2:
                interval = int(sys.argv[2])
            print(f"Mode surveillance activé. Vérification toutes les {interval} secondes. Ctrl+C pour arrêter.")
            while True:
                monitor_deployments()
                print(f"\nAttente de {interval} secondes avant la prochaine vérification...")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\nSurveillance arrêtée par l'utilisateur.")
    else:
        # Mode exécution unique
        monitor_deployments()

if __name__ == "__main__":
    main()
