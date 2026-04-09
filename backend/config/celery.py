import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


# SMUK-14
# testowy task sprawdzajacy pipeline django->redis->celery->logs
# wykonywany recznie:
# ---
# docker compose exec backend python manage.py shell -c "from config.celery import debug_task; debug_task.delay()"
# ---
@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
