import os
import re
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from mysql.connector import Error

from db import get_db_connection, init_db_skills, init_team_request_tables
from api import api_bp
from flask_cors import CORS

app = Flask(__name__)
CORS(
    app,
    supports_credentials=True,
    origins=[
        "https://skillmatch-gold.vercel.app"
    ]
)

app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"] = True




# Configure secret key for session management
app.secret_key = os.getenv('SECRET_KEY', 'skillmatch_fallback_secret_key_2026')
react_dev_origin = os.getenv('REACT_DEV_ORIGIN', 'http://localhost:8080')


# Initialize default skills in database if empty
init_db_skills()
init_team_request_tables()
app.register_blueprint(api_bp)


@app.after_request
def add_api_cors_headers(response):
    """Allow credentialed requests only from the configured React dev origin."""
    if request.path.startswith('/api/') and request.headers.get('Origin') == react_dev_origin:
        response.headers['Access-Control-Allow-Origin'] = react_dev_origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS'
        response.headers['Vary'] = 'Origin'
    return response


def login_required(f):
    """
    Decorator to enforce login on protected routes.
    Redirects unauthenticated users to the login page.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            flash("Please log in to access this page.", "danger")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


def get_project_team_count(cursor, project_id):
    """Return the owner plus accepted members for a project."""
    cursor.execute(
        "SELECT COUNT(*) AS member_count FROM project_members WHERE project_id = %s",
        (project_id,)
    )
    return cursor.fetchone()['member_count'] + 1


@app.route('/')
def home():
    """
    Root route: Redirects logged in users to dashboard, otherwise to login.
    """
    if session.get('user_id'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    """
    Registration route: Handles new student registration.
    Validates form data, checks duplicate email, hashes password, and saves to database.
    """
    if session.get('user_id'):
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        # 1. Form Validation
        if not name or not email or not password or not confirm_password:
            flash("All fields are required.", "danger")
            return render_template('register.html')

        # Basic email format validation
        email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_regex, email):
            flash("Please enter a valid email address.", "danger")
            return render_template('register.html')

        if len(password) < 6:
            flash("Password must be at least 6 characters long.", "danger")
            return render_template('register.html')

        if password != confirm_password:
            flash("Passwords do not match. Please try again.", "danger")
            return render_template('register.html')

        # 2. Database Checks & Registration
        connection = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)

            # Check if email already exists
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            existing_user = cursor.fetchone()

            if existing_user:
                flash("An account with this email address already exists.", "danger")
                cursor.close()
                return render_template('register.html')

            # 3. Hash Password Securely
            hashed_password = generate_password_hash(password)

            # 4. Insert user into MySQL database
            cursor.execute(
                "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
                (name, email, hashed_password)
            )
            connection.commit()
            cursor.close()

            flash("Account created successfully! Please log in.", "success")
            return redirect(url_for('login'))

        except Error as err:
            flash(f"Database error during registration: {str(err)}", "danger")
            return render_template('register.html')
        finally:
            if connection and connection.is_connected():
                connection.close()

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Login route: Verifies credentials against hashed password and creates session.
    """
    if session.get('user_id'):
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        if not email or not password:
            flash("Please enter both email and password.", "danger")
            return render_template('login.html')

        connection = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)

            # Fetch user record by email
            cursor.execute(
                "SELECT id, name, email, password FROM users WHERE email = %s",
                (email,)
            )
            user = cursor.fetchone()
            cursor.close()

            # Verify user exists and check password hash
            if user and check_password_hash(user['password'], password):
                # Set session variables
                session['user_id'] = user['id']
                session['user_name'] = user['name']
                session['user_email'] = user['email']

                flash(f"Welcome back, {user['name']}!", "success")
                return redirect(url_for('dashboard'))
            else:
                flash("Invalid email or password.", "danger")
                return render_template('login.html')

        except Error as err:
            flash(f"Database error during login: {str(err)}", "danger")
            return render_template('login.html')
        finally:
            if connection and connection.is_connected():
                connection.close()

    return render_template('login.html')


@app.route('/logout')
def logout():
    """
    Logout route: Clears the session and redirects to login.
    """
    session.clear()
    flash("You have been logged out successfully.", "info")
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    """
    Protected Dashboard route: Displays account summary and user skills.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Fetch User Record
        cursor.execute(
            "SELECT id, name, email, bio, github_url, created_at FROM users WHERE id = %s",
            (session['user_id'],)
        )
        user = cursor.fetchone()

        if not user:
            session.clear()
            flash("User record not found.", "danger")
            return redirect(url_for('login'))

        # 2. Fetch User's Selected Skills
        cursor.execute(
            """
            SELECT s.id, s.skill_name 
            FROM skills s 
            JOIN user_skills us ON s.id = us.skill_id 
            WHERE us.user_id = %s 
            ORDER BY s.skill_name ASC
            """,
            (session['user_id'],)
        )
        user_skills = cursor.fetchall()
        cursor.close()

        return render_template('dashboard.html', user=user, user_skills=user_skills)

    except Error as err:
        flash(f"Database error loading dashboard: {str(err)}", "danger")
        return redirect(url_for('login'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/profile')
@login_required
def profile():
    """
    Protected Profile route: Displays student details and skills management UI.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, name, email, bio, github_url, created_at FROM users WHERE id = %s",
            (session['user_id'],)
        )
        user = cursor.fetchone()

        cursor.execute(
            """
            SELECT s.id, s.skill_name 
            FROM skills s 
            JOIN user_skills us ON s.id = us.skill_id 
            WHERE us.user_id = %s 
            ORDER BY s.skill_name ASC
            """,
            (session['user_id'],)
        )
        user_skills = cursor.fetchall()

        cursor.execute("SELECT id, skill_name FROM skills ORDER BY skill_name ASC")
        all_skills = cursor.fetchall()
        cursor.close()

        return render_template(
            'profile.html', 
            user=user, 
            user_skills=user_skills, 
            all_skills=all_skills
        )

    except Error as err:
        flash(f"Database error loading profile: {str(err)}", "danger")
        return redirect(url_for('dashboard'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/profile/update', methods=['POST'])
@login_required
def update_profile():
    """
    Updates student profile details (Name, Bio, GitHub URL).
    """
    name = request.form.get('name', '').strip()
    bio = request.form.get('bio', '').strip()
    github_url = request.form.get('github_url', '').strip()

    if not name:
        flash("Full Name cannot be empty.", "danger")
        return redirect(url_for('profile'))

    if github_url and not (github_url.startswith('http://') or github_url.startswith('https://')):
        github_url = 'https://' + github_url

    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "UPDATE users SET name = %s, bio = %s, github_url = %s WHERE id = %s",
            (name, bio, github_url, session['user_id'])
        )
        connection.commit()
        cursor.close()

        session['user_name'] = name

        flash("Profile updated successfully!", "success")
    except Error as err:
        flash(f"Database error updating profile: {str(err)}", "danger")
    finally:
        if connection and connection.is_connected():
            connection.close()

    return redirect(url_for('profile'))


@app.route('/profile/skill/add', methods=['POST'])
@login_required
def add_skill():
    """
    Adds a skill to the current user's profile using the user_skills junction table.
    """
    skill_id_input = request.form.get('skill_id', '').strip()
    custom_skill_input = request.form.get('custom_skill', '').strip()

    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        target_skill_id = None

        if skill_id_input:
            target_skill_id = int(skill_id_input)
        elif custom_skill_input:
            cursor.execute("SELECT id FROM skills WHERE LOWER(skill_name) = LOWER(%s)", (custom_skill_input,))
            existing_skill = cursor.fetchone()

            if existing_skill:
                target_skill_id = existing_skill['id']
            else:
                cursor.execute("INSERT INTO skills (skill_name) VALUES (%s)", (custom_skill_input,))
                connection.commit()
                target_skill_id = cursor.lastrowid
        else:
            flash("Please select an existing skill or enter a custom skill.", "danger")
            cursor.close()
            return redirect(url_for('profile'))

        cursor.execute(
            "SELECT * FROM user_skills WHERE user_id = %s AND skill_id = %s",
            (session['user_id'], target_skill_id)
        )
        existing_user_skill = cursor.fetchone()

        if existing_user_skill:
            flash("This skill is already added to your profile.", "info")
        else:
            cursor.execute(
                "INSERT INTO user_skills (user_id, skill_id) VALUES (%s, %s)",
                (session['user_id'], target_skill_id)
            )
            connection.commit()
            flash("Skill added to your profile successfully!", "success")

        cursor.close()
    except Error as err:
        flash(f"Database error adding skill: {str(err)}", "danger")
    finally:
        if connection and connection.is_connected():
            connection.close()

    return redirect(url_for('profile'))


@app.route('/profile/skill/remove/<int:skill_id>', methods=['POST'])
@login_required
def remove_skill(skill_id):
    """
    Removes a skill from the current user's profile in user_skills junction table.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM user_skills WHERE user_id = %s AND skill_id = %s",
            (session['user_id'], skill_id)
        )
        connection.commit()
        cursor.close()

        flash("Skill removed from your profile.", "info")
    except Error as err:
        flash(f"Database error removing skill: {str(err)}", "danger")
    finally:
        if connection and connection.is_connected():
            connection.close()

    return redirect(url_for('profile'))


# --- PROJECTS MANAGEMENT ROUTES ---

@app.route('/projects')
@login_required
def projects():
    """
    Explore Projects route: Displays list of all available student projects
    and their required skills.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT p.id, p.title, p.description, p.team_size, p.owner_id, p.created_at, u.name AS owner_name
                 , EXISTS(
                     SELECT 1 FROM project_members pm
                     WHERE pm.project_id = p.id AND pm.user_id = %s
                 ) AS is_member
                 , EXISTS(
                     SELECT 1 FROM team_requests tr
                     WHERE tr.project_id = p.id AND tr.sender_id = %s AND tr.status = 'pending'
                 ) AS has_pending_request
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            ORDER BY p.created_at DESC
            """,
            (session['user_id'], session['user_id'])
        )
        projects_list = cursor.fetchall()

        for proj in projects_list:
            cursor.execute(
                """
                SELECT s.id, s.skill_name
                FROM skills s
                JOIN project_skills ps ON s.id = ps.skill_id
                WHERE ps.project_id = %s
                ORDER BY s.skill_name ASC
                """,
                (proj['id'],)
            )
            proj['skills'] = cursor.fetchall()
            proj['current_team_count'] = get_project_team_count(cursor, proj['id'])

        cursor.close()
        return render_template('projects.html', projects=projects_list)

    except Error as err:
        flash(f"Database error loading projects: {str(err)}", "danger")
        return redirect(url_for('dashboard'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/projects/create', methods=['GET', 'POST'])
@login_required
def create_project():
    """
    Create Project route: Handles creation of a new student project and its required skills.
    """
    connection = None
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        team_size_input = request.form.get('team_size', '1').strip()
        skill_ids = request.form.getlist('skill_ids')

        if not title:
            flash("Project Title cannot be empty.", "danger")
            return redirect(url_for('create_project'))

        if not description:
            flash("Project Description cannot be empty.", "danger")
            return redirect(url_for('create_project'))

        try:
            team_size = int(team_size_input)
            if team_size <= 0:
                raise ValueError()
        except ValueError:
            flash("Team Size must be a positive number greater than 0.", "danger")
            return redirect(url_for('create_project'))

        if not skill_ids:
            flash("Please select at least one required skill for your project.", "danger")
            return redirect(url_for('create_project'))

        try:
            connection = get_db_connection()
            cursor = connection.cursor()

            cursor.execute(
                "INSERT INTO projects (title, description, owner_id, team_size) VALUES (%s, %s, %s, %s)",
                (title, description, session['user_id'], team_size)
            )
            project_id = cursor.lastrowid

            for skill_id in skill_ids:
                cursor.execute(
                    "INSERT INTO project_skills (project_id, skill_id) VALUES (%s, %s)",
                    (project_id, int(skill_id))
                )

            connection.commit()
            cursor.close()

            flash("Project created successfully!", "success")
            return redirect(url_for('projects'))

        except Error as err:
            flash(f"Database error creating project: {str(err)}", "danger")
            return redirect(url_for('create_project'))
        finally:
            if connection and connection.is_connected():
                connection.close()

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, skill_name FROM skills ORDER BY skill_name ASC")
        all_skills = cursor.fetchall()
        cursor.close()
        return render_template('create_project.html', all_skills=all_skills, selected_skill_ids=[])
    except Error as err:
        flash(f"Database error loading skills: {str(err)}", "danger")
        return redirect(url_for('projects'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/projects/edit/<int:project_id>', methods=['GET', 'POST'])
@login_required
def edit_project(project_id):
    """
    Edit Project route: Allows project owners to edit their project details and required skills.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
        project = cursor.fetchone()

        if not project:
            flash("Project not found.", "danger")
            cursor.close()
            return redirect(url_for('projects'))

        if project['owner_id'] != session['user_id']:
            flash("You can only edit projects that you created.", "danger")
            cursor.close()
            return redirect(url_for('projects'))

        if request.method == 'POST':
            title = request.form.get('title', '').strip()
            description = request.form.get('description', '').strip()
            team_size_input = request.form.get('team_size', '1').strip()
            skill_ids = request.form.getlist('skill_ids')

            if not title:
                flash("Project Title cannot be empty.", "danger")
                return redirect(url_for('edit_project', project_id=project_id))

            if not description:
                flash("Project Description cannot be empty.", "danger")
                return redirect(url_for('edit_project', project_id=project_id))

            try:
                team_size = int(team_size_input)
                if team_size <= 0:
                    raise ValueError()
            except ValueError:
                flash("Team Size must be a positive number greater than 0.", "danger")
                return redirect(url_for('edit_project', project_id=project_id))

            if not skill_ids:
                flash("Please select at least one required skill for your project.", "danger")
                return redirect(url_for('edit_project', project_id=project_id))

            cursor.execute(
                "UPDATE projects SET title = %s, description = %s, team_size = %s WHERE id = %s AND owner_id = %s",
                (title, description, team_size, project_id, session['user_id'])
            )

            cursor.execute("DELETE FROM project_skills WHERE project_id = %s", (project_id,))

            for skill_id in skill_ids:
                cursor.execute(
                    "INSERT INTO project_skills (project_id, skill_id) VALUES (%s, %s)",
                    (project_id, int(skill_id))
                )

            connection.commit()
            cursor.close()

            flash("Project updated successfully!", "success")
            return redirect(url_for('projects'))

        cursor.execute("SELECT skill_id FROM project_skills WHERE project_id = %s", (project_id,))
        selected_skill_ids = [row['skill_id'] for row in cursor.fetchall()]

        cursor.execute("SELECT id, skill_name FROM skills ORDER BY skill_name ASC")
        all_skills = cursor.fetchall()
        cursor.close()

        return render_template(
            'edit_project.html',
            project=project,
            all_skills=all_skills,
            selected_skill_ids=selected_skill_ids
        )

    except Error as err:
        flash(f"Database error updating project: {str(err)}", "danger")
        return redirect(url_for('projects'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/projects/delete/<int:project_id>', methods=['POST'])
@login_required
def delete_project(project_id):
    """
    Delete Project route: Allows project owners to delete their project.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT owner_id FROM projects WHERE id = %s", (project_id,))
        project = cursor.fetchone()

        if not project:
            flash("Project not found.", "danger")
            cursor.close()
            return redirect(url_for('projects'))

        if project['owner_id'] != session['user_id']:
            flash("You can only delete your own projects.", "danger")
            cursor.close()
            return redirect(url_for('projects'))

        cursor.execute("DELETE FROM project_skills WHERE project_id = %s", (project_id,))
        cursor.execute("DELETE FROM projects WHERE id = %s AND owner_id = %s", (project_id, session['user_id']))
        connection.commit()
        cursor.close()

        flash("Project deleted successfully.", "info")
    except Error as err:
        flash(f"Database error deleting project: {str(err)}", "danger")
    finally:
        if connection and connection.is_connected():
            connection.close()

    return redirect(url_for('projects'))


# --- TEAM REQUEST ROUTES ---

@app.route('/projects/<int:project_id>/request', methods=['POST'])
@login_required
def request_to_join_project(project_id):
    """Send a single pending join request to another student's project."""
    connection = None
    destination = 'matches' if request.form.get('next_page') == 'matches' else 'projects'
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)
        requester_id = session['user_id']

        cursor.execute(
            "SELECT id, owner_id, team_size, title FROM projects WHERE id = %s FOR UPDATE",
            (project_id,)
        )
        project = cursor.fetchone()
        if not project:
            flash("Project not found.", "danger")
        elif project['owner_id'] == requester_id:
            flash("You cannot request to join your own project.", "danger")
        else:
            cursor.execute(
                "SELECT 1 FROM project_members WHERE project_id = %s AND user_id = %s LIMIT 1",
                (project_id, requester_id)
            )
            if cursor.fetchone():
                flash("You are already a member of this project.", "info")
            elif get_project_team_count(cursor, project_id) >= project['team_size']:
                flash("This project's team is already full.", "info")
            else:
                cursor.execute(
                    """
                    SELECT 1 FROM team_requests
                    WHERE project_id = %s AND sender_id = %s AND status = 'pending'
                    LIMIT 1
                    """,
                    (project_id, requester_id)
                )
                if cursor.fetchone():
                    flash("You already have a pending request for this project.", "info")
                else:
                    cursor.execute(
                        """
                        INSERT INTO team_requests (project_id, sender_id, receiver_id, status)
                        VALUES (%s, %s, %s, 'pending')
                        """,
                        (project_id, requester_id, project['owner_id'])
                    )
                    connection.commit()
                    flash(f"Join request sent for {project['title']}.", "success")
        cursor.close()
    except Error as err:
        if connection:
            connection.rollback()
        flash(f"Database error sending request: {str(err)}", "danger")
    finally:
        if connection and connection.is_connected():
            connection.close()
    return redirect(url_for(destination))


@app.route('/team-requests')
@login_required
def team_requests():
    """Show both requests sent by the user and requests for their projects."""
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        user_id = session['user_id']
        cursor.execute(
            """
            SELECT tr.id, tr.status, tr.created_at, p.title AS project_title
            FROM team_requests tr
            JOIN projects p ON p.id = tr.project_id
            WHERE tr.sender_id = %s
            ORDER BY tr.created_at DESC
            """,
            (user_id,)
        )
        sent_requests = cursor.fetchall()

        cursor.execute(
            """
            SELECT tr.id, tr.project_id, tr.status, tr.created_at, p.title AS project_title,
                   u.name AS requester_name, u.email AS requester_email
            FROM team_requests tr
            JOIN projects p ON p.id = tr.project_id
            JOIN users u ON u.id = tr.sender_id
            WHERE p.owner_id = %s
            ORDER BY tr.status = 'pending' DESC, tr.created_at DESC
            """,
            (user_id,)
        )
        incoming_requests = cursor.fetchall()
        for team_request in incoming_requests:
            team_request['current_team_count'] = get_project_team_count(cursor, team_request['project_id'])
            cursor.execute("SELECT team_size FROM projects WHERE id = %s", (team_request['project_id'],))
            team_request['team_size'] = cursor.fetchone()['team_size']

        cursor.close()
        return render_template(
            'team_requests.html',
            sent_requests=sent_requests,
            incoming_requests=incoming_requests
        )
    except Error as err:
        flash(f"Database error loading team requests: {str(err)}", "danger")
        return redirect(url_for('dashboard'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/team-requests/<int:request_id>/<action>', methods=['POST'])
@login_required
def respond_to_team_request(request_id, action):
    """Accept or reject an incoming request, enforcing the project capacity."""
    if action not in ('accept', 'reject'):
        flash("Invalid request action.", "danger")
        return redirect(url_for('team_requests'))

    connection = None
    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT tr.id, tr.project_id, tr.sender_id, tr.status, p.owner_id, p.team_size, p.title
            FROM team_requests tr
            JOIN projects p ON p.id = tr.project_id
            WHERE tr.id = %s FOR UPDATE
            """,
            (request_id,)
        )
        team_request = cursor.fetchone()
        if not team_request:
            flash("Team request not found.", "danger")
        elif team_request['owner_id'] != session['user_id']:
            flash("Only the project creator can respond to this request.", "danger")
        elif team_request['status'] != 'pending':
            flash("This request has already been processed.", "info")
        elif action == 'reject':
            cursor.execute("UPDATE team_requests SET status = 'rejected' WHERE id = %s", (request_id,))
            connection.commit()
            flash("Join request rejected.", "info")
        else:
            cursor.execute("SELECT id FROM projects WHERE id = %s FOR UPDATE", (team_request['project_id'],))
            # Project ID is unique, but fetch its row before reusing this cursor.
            # Without this fetch, MySQL Connector raises "Unread result found"
            # when get_project_team_count executes its SELECT on the same cursor.
            cursor.fetchone()
            current_team_count = get_project_team_count(cursor, team_request['project_id'])
            cursor.execute(
                "SELECT 1 FROM project_members WHERE project_id = %s AND user_id = %s LIMIT 1",
                (team_request['project_id'], team_request['sender_id'])
            )
            if cursor.fetchone():
                flash("This student is already a project member.", "info")
            elif current_team_count >= team_request['team_size']:
                flash("The team is full; this request remains pending.", "danger")
            else:
                cursor.execute(
                    "INSERT INTO project_members (project_id, user_id) VALUES (%s, %s)",
                    (team_request['project_id'], team_request['sender_id'])
                )
                cursor.execute("UPDATE team_requests SET status = 'accepted' WHERE id = %s", (request_id,))
                connection.commit()
                flash(f"Request accepted. The student joined {team_request['title']}.", "success")
        cursor.close()
    except Error as err:
        if connection:
            connection.rollback()
        flash(f"Database error processing request: {str(err)}", "danger")
    finally:
        if connection and connection.is_connected():
            connection.close()
    return redirect(url_for('team_requests'))


# --- SKILL MATCHING ALGORITHM ROUTE ---

@app.route('/matches')
@login_required
def matches():
    """
    Skill Matching Route: Calculates match percentages between the logged-in student's
    profile skills and available projects (excluding projects created by the logged-in user).
    Formula: (Matching Skills / Required Project Skills) * 100
    Projects are sorted from highest match percentage to lowest.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        user_id = session['user_id']

        # 1. Fetch current logged-in user's skills
        cursor.execute(
            """
            SELECT s.id, s.skill_name 
            FROM skills s 
            JOIN user_skills us ON s.id = us.skill_id 
            WHERE us.user_id = %s 
            ORDER BY s.skill_name ASC
            """,
            (user_id,)
        )
        user_skills = cursor.fetchall()
        user_skill_ids = {s['id'] for s in user_skills}
        user_skill_names = {s['skill_name'].lower().strip() for s in user_skills}

        # 2. Fetch all available projects EXCEPT those owned by the current user
        cursor.execute(
            """
            SELECT p.id, p.title, p.description, p.team_size, p.owner_id, p.created_at, u.name AS owner_name,
                   EXISTS(
                       SELECT 1 FROM project_members pm
                       WHERE pm.project_id = p.id AND pm.user_id = %s
                   ) AS is_member,
                   EXISTS(
                       SELECT 1 FROM team_requests tr
                       WHERE tr.project_id = p.id AND tr.sender_id = %s AND tr.status = 'pending'
                   ) AS has_pending_request
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            WHERE p.owner_id != %s
            ORDER BY p.created_at DESC
            """,
            (user_id, user_id, user_id)
        )
        projects_list = cursor.fetchall()

        # 3. Calculate match score for each project
        for proj in projects_list:
            cursor.execute(
                """
                SELECT s.id, s.skill_name 
                FROM skills s 
                JOIN project_skills ps ON s.id = ps.skill_id 
                WHERE ps.project_id = %s 
                ORDER BY s.skill_name ASC
                """,
                (proj['id'],)
            )
            required_skills = cursor.fetchall()

            # Robust matching: check both ID and normalized case-insensitive name
            matching_skills = [
                s for s in required_skills 
                if s['id'] in user_skill_ids or s['skill_name'].lower().strip() in user_skill_names
            ]
            missing_skills = [
                s for s in required_skills 
                if s['id'] not in user_skill_ids and s['skill_name'].lower().strip() not in user_skill_names
            ]

            num_required = len(required_skills)
            num_matching = len(matching_skills)

            # Match Percentage Calculation: (matching / required) * 100
            if num_required > 0:
                match_percentage = round((num_matching / num_required) * 100, 1)
                if match_percentage.is_integer():
                    match_percentage = int(match_percentage)
            else:
                match_percentage = 0

            proj['required_skills'] = required_skills
            proj['matching_skills'] = matching_skills
            proj['missing_skills'] = missing_skills
            proj['num_matching'] = num_matching
            proj['num_required'] = num_required
            proj['match_percentage'] = match_percentage
            proj['current_team_count'] = get_project_team_count(cursor, proj['id'])

        # 4. Sort projects from highest match percentage to lowest
        projects_list.sort(key=lambda x: (x['match_percentage'], x['num_matching']), reverse=True)

        cursor.close()
        return render_template('matches.html', user_skills=user_skills, projects=projects_list)

    except Error as err:
        flash(f"Database error calculating matches: {str(err)}", "danger")
        return redirect(url_for('dashboard'))
    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route('/db-test')
def db_test():
    """
    Test endpoint to verify MySQL database connection.
    """
    connection = None
    try:
        connection = get_db_connection()
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT DATABASE();")
            db_name = cursor.fetchone()[0]
            cursor.close()
            return f"Database connected successfully! Connected to: {db_name}"
    except Error as err:
        return f"Database connection failed: {str(err)}", 500
    finally:
        if connection and connection.is_connected():
            connection.close()


if __name__ == '__main__':
    app.run(debug=True)
