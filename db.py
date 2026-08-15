import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_db_connection():
    """
    Creates and returns a reusable MySQL database connection instance
    using credentials loaded from environment variables.
    """
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'skillmatch_db'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        return connection
    except Error as e:
        print(f"Failed to connect to MySQL database: {e}")
        raise e


def init_db_skills():
    """
    Seeds default common skills into the skills table if it is currently empty.
    """
    default_skills = [
        'Python', 'JavaScript', 'TypeScript', 'HTML/CSS', 'React',
        'Flask', 'Django', 'Node.js', 'Express.js', 'MySQL',
        'PostgreSQL', 'MongoDB', 'Git', 'Docker', 'C++',
        'Java', 'C#', 'Data Analysis', 'Machine Learning',
        'UI/UX Design', 'Figma', 'Tailwind CSS'
    ]
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM skills;")
        count = cursor.fetchone()[0]
        if count == 0:
            for skill in default_skills:
                cursor.execute("INSERT IGNORE INTO skills (skill_name) VALUES (%s);", (skill,))
            connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error seeding default skills: {e}")
    finally:
        if connection and connection.is_connected():
            connection.close()


def init_team_request_tables():
    """Create the project membership junction table when it is not present.

    ``team_requests`` already exists in this project and stores requesters as
    ``sender_id`` and project owners as ``receiver_id``.  This function leaves
    that existing schema untouched and adds the table needed after acceptance.
    """
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS project_members (
                project_id INT NOT NULL,
                user_id INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (project_id, user_id),
                CONSTRAINT project_members_project_fk
                    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                CONSTRAINT project_members_user_fk
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )
        connection.commit()
        cursor.close()
    except Error as e:
        print(f"Error creating project members table: {e}")
        raise e
    finally:
        if connection and connection.is_connected():
            connection.close()
