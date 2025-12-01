from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

# ------------------ DB CONNECTION ------------------
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Thennu67@#",
        database="local_job_finder"
    )

# ------------------ FORMAT TIMESTAMP ------------------
def fix_dates(rows):
    for r in rows:
        for field in ["created_at", "accepted_at", "completed_at"]:
            if field in r and r[field] is not None:
                r[field] = r[field].strftime("%Y-%m-%d %H:%M:%S")
    return rows



# ------------------ SIGNUP ------------------
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    name = data.get("name")
    mobile = data.get("mobile")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    skills = ",".join(data.get("skills", []))
    experience = data.get("workerExp")
    aadhaar = data.get("workerAadhaar")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"message": "Email already registered!"}), 400

    cursor.execute("""
        INSERT INTO users (name, mobile, email, password, role, skills, experience, aadhaar)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (name, mobile, email, password, role, skills, experience, aadhaar))

    conn.commit()
    conn.close()

    return jsonify({"message": "Signup successful!"})


# ------------------ LOGIN ------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT id, role, name FROM users WHERE email = %s AND password = %s",
                   (email, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            "message": "Login successful!",
            "id": user["id"],
            "role": user["role"],
            "name": user["name"]
        })
    else:
        return jsonify({"message": "Invalid email or password!"}), 401


# ------------------ POST JOB ------------------
@app.route("/post_job", methods=["POST"])
def post_job():
    data = request.get_json()

    employer_id = data.get("employer_id")
    employer_name = data.get("employer_name")
    job_title = data.get("job_title")
    job_description = data.get("job_description")
    job_location = data.get("job_location")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO jobs_new (employer_id, employer_name, job_title, job_description, job_location, created_at)
        VALUES (%s, %s, %s, %s, %s, NOW())
    """, (employer_id, employer_name, job_title, job_description, job_location))

    conn.commit()
    conn.close()

    return jsonify({"message": "Job posted"})


# ------------------ GET JOBS FOR WORKER ------------------
@app.route("/get_jobs_new", methods=["GET"])
def get_jobs_new():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, employer_id, employer_name, job_title, job_description, job_location, status, created_at
        FROM jobs_new ORDER BY id DESC
    """)
    jobs_new = cursor.fetchall()
    conn.close()

    return jsonify(fix_dates(jobs_new))


# ------------------ ACCEPT JOB ------------------
@app.route("/accept_job", methods=["POST"])
def accept_job():
    data = request.get_json()
    job_id = data.get("job_id")
    worker_id = data.get("worker_id")
    worker_name = data.get("worker_name")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE jobs_new
        SET worker_id = %s,
            worker_name = %s,
            status = 'Accepted',
            accepted_at = NOW()
        WHERE id = %s
    """, (worker_id, worker_name, job_id))

    conn.commit()
    conn.close()

    return jsonify({"message": "Job accepted"})



# ------------------ REJECT JOB ------------------
@app.route("/reject_job", methods=["POST"])
def reject_job():
    data = request.get_json()
    job_id = data.get("job_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE jobs_new
        SET status = 'Rejected', worker_id = NULL, worker_name = NULL
        WHERE id = %s
    """, (job_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Job rejected"})


# ------------------ EMPLOYER POSTED JOBS ------------------
@app.route("/get_posted_jobs_new/<int:employer_id>", methods=["GET"])
def get_posted_jobs_new(employer_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, job_title, job_description, job_location,
               status, worker_name, created_at, accepted_at, completed_at
        FROM jobs_new
        WHERE employer_id = %s
        ORDER BY id DESC
    """, (employer_id,))

    jobs_new = cursor.fetchall()
    conn.close()

    return jsonify(fix_dates(jobs_new))




# ------------------ WORKER ACCEPTED JOBS ------------------
@app.route("/get_accepted_jobs_new/<int:worker_id>", methods=["GET"])
def get_accepted_jobs_new(worker_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM jobs_new
        WHERE worker_id = %s AND status = 'Accepted'
        ORDER BY id DESC
    """, (worker_id,))

    jobs_new = cursor.fetchall()
    conn.close()

    return jsonify(fix_dates(jobs_new))


# ------------------ COMPLETE JOB ------------------
@app.route("/complete_job", methods=["POST"])
def complete_job():
    data = request.get_json()
    job_id = data.get("job_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE jobs_new
        SET status = 'Completed',
            completed_at = NOW()
        WHERE id = %s
    """, (job_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Job Completed"})



# ------------------ COMPLETED JOBS LIST ------------------
@app.route("/get_completed_jobs/<int:worker_id>", methods=["GET"])
def get_completed_jobs(worker_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT *
        FROM jobs_new
        WHERE worker_id = %s AND status = 'Completed'
        ORDER BY id DESC
    """, (worker_id,))

    jobs = cursor.fetchall()
    conn.close()

    return jsonify(fix_dates(jobs))


# ------------------ RUN SERVER ------------------
if __name__ == "__main__":
    app.run(debug=True)
