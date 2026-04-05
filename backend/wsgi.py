import os
import logging
from flask import Flask, send_from_directory, request, make_response

from app.routes.health import health_bp
from app.routes.users import users_bp
from app.routes.onboarding import onboarding_bp
from app.routes.leads import leads_bp
from app.routes.contacts import contacts_bp
from app.routes.email_templates import email_templates_bp
from app.routes.campaigns import campaigns_bp
from app.routes.pipeline import pipeline_bp
from app.routes.gmail_oauth import gmail_oauth_bp
from app.routes.tasks import tasks_bp
from app.routes.quotes import quotes_bp
from app.routes.replies import replies_bp
from app.routes.sequences import sequences_bp
from app.routes.tracking import tracking_bp
from app.routes.analytics import analytics_bp
from app.routes.calendar import calendar_bp
from app.extensions import init_app_extensions


def create_app() -> Flask:
    BACKEND_DIR = os.path.dirname(__file__)
    PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
    STATIC_DIR = os.path.join(PROJECT_ROOT, "frontend", "dist")

    app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")

    logging.basicConfig(level=logging.INFO)
    app.logger.setLevel(logging.INFO)

    init_app_extensions(app)

    # Register blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(onboarding_bp)
    app.register_blueprint(leads_bp)
    app.register_blueprint(contacts_bp)
    app.register_blueprint(email_templates_bp)
    app.register_blueprint(campaigns_bp)
    app.register_blueprint(pipeline_bp)
    app.register_blueprint(gmail_oauth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(quotes_bp)
    app.register_blueprint(replies_bp)
    app.register_blueprint(sequences_bp)
    app.register_blueprint(tracking_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(calendar_bp)

    # Serve static assets
    @app.route("/assets/<path:filename>")
    def vite_assets(filename):
        assets_dir = os.path.join(app.static_folder, "assets")
        response = send_from_directory(assets_dir, filename)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    @app.route("/")
    def index():
        response = make_response(send_from_directory(app.static_folder, "index.html"))
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response

    # SPA fallback
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/"):
            return "API endpoint not found", 404
        index_path = os.path.join(app.static_folder, "index.html")
        if os.path.exists(index_path):
            response = make_response(send_from_directory(app.static_folder, "index.html"))
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            return response
        return "Frontend build not found", 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
