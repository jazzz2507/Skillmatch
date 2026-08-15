"""Session-authenticated JSON API for the React client."""
from functools import wraps
import re
from flask import Blueprint, jsonify, request, session
from mysql.connector import Error
from werkzeug.security import check_password_hash, generate_password_hash
from db import get_db_connection

api_bp = Blueprint('api', __name__, url_prefix='/api')

def fail(message, status): return jsonify(error=message), status
def data():
    value = request.get_json(silent=True)
    return value if isinstance(value, dict) else None
def protected(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get('user_id'): return fail('Authentication is required.', 401)
        return view(*args, **kwargs)
    return wrapped
def finish(connection, cursor=None, rollback=False):
    if connection:
        if rollback or connection.in_transaction: connection.rollback()
        if cursor: cursor.close()
        if connection.is_connected(): connection.close()
def user_public(row): return {key: row.get(key) for key in ('id','name','email','bio','github_url','created_at')}
def get_user(cursor, user_id):
    cursor.execute('SELECT id,name,email,bio,github_url,created_at FROM users WHERE id=%s', (user_id,))
    return cursor.fetchone()
def user_skills(cursor, user_id):
    cursor.execute('SELECT s.id,s.skill_name FROM skills s JOIN user_skills us ON s.id=us.skill_id WHERE us.user_id=%s ORDER BY s.skill_name', (user_id,))
    return cursor.fetchall()
def member_count(cursor, project_id):
    cursor.execute('SELECT COUNT(*) AS total FROM project_members WHERE project_id=%s', (project_id,))
    return cursor.fetchone()['total'] + 1
def project(cursor, project_id, viewer_id):
    cursor.execute("""SELECT p.id,p.title,p.description,p.team_size,p.owner_id,p.created_at,u.name AS owner_name,
        EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=%s) AS is_member,
        EXISTS(SELECT 1 FROM team_requests tr WHERE tr.project_id=p.id AND tr.sender_id=%s AND tr.status='pending') AS has_pending_request
        FROM projects p JOIN users u ON p.owner_id=u.id WHERE p.id=%s""", (viewer_id, viewer_id, project_id))
    item = cursor.fetchone()
    if not item: return None
    cursor.execute('SELECT s.id,s.skill_name FROM skills s JOIN project_skills ps ON s.id=ps.skill_id WHERE ps.project_id=%s ORDER BY s.skill_name', (project_id,))
    item['skills'] = cursor.fetchall(); item['current_team_count'] = member_count(cursor, project_id)
    return item
def project_payload(value):
    title, description, skills = str(value.get('title','')).strip(), str(value.get('description','')).strip(), value.get('skill_ids')
    if not title or not description: return None, 'Title and description are required.'
    if not isinstance(skills, list) or not skills: return None, 'At least one required skill must be selected.'
    try: team_size, skill_ids = int(value.get('team_size', 1)), sorted({int(x) for x in skills})
    except (ValueError, TypeError): return None, 'Team size and skill IDs must be numbers.'
    if team_size <= 0 or any(x <= 0 for x in skill_ids): return None, 'Team size and skill IDs must be positive.'
    return (title, description, team_size, skill_ids), None
def validate_skills(cursor, skill_ids):
    cursor.execute('SELECT COUNT(*) AS total FROM skills WHERE id IN ({})'.format(','.join(['%s'] * len(skill_ids))), tuple(skill_ids))
    return cursor.fetchone()['total'] == len(skill_ids)
def match_results(cursor, user_id):
    """Exact existing /matches calculation, returned as JSON data."""
    skills = user_skills(cursor, user_id); ids = {s['id'] for s in skills}; names = {s['skill_name'].lower().strip() for s in skills}
    cursor.execute("""SELECT p.id,p.title,p.description,p.team_size,p.owner_id,p.created_at,u.name AS owner_name,
        EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=%s) AS is_member,
        EXISTS(SELECT 1 FROM team_requests tr WHERE tr.project_id=p.id AND tr.sender_id=%s AND tr.status='pending') AS has_pending_request
        FROM projects p JOIN users u ON p.owner_id=u.id WHERE p.owner_id != %s ORDER BY p.created_at DESC""", (user_id,user_id,user_id))
    projects = cursor.fetchall()
    for item in projects:
        cursor.execute('SELECT s.id,s.skill_name FROM skills s JOIN project_skills ps ON s.id=ps.skill_id WHERE ps.project_id=%s ORDER BY s.skill_name', (item['id'],))
        required = cursor.fetchall()
        matching = [s for s in required if s['id'] in ids or s['skill_name'].lower().strip() in names]
        missing = [s for s in required if s['id'] not in ids and s['skill_name'].lower().strip() not in names]
        total = len(required); percentage = round((len(matching) / total) * 100, 1) if total else 0
        if isinstance(percentage, float) and percentage.is_integer(): percentage = int(percentage)
        item.update(required_skills=required, matching_skills=matching, missing_skills=missing, num_matching=len(matching), num_required=total, match_percentage=percentage, current_team_count=member_count(cursor, item['id']))
    projects.sort(key=lambda x: (x['match_percentage'], x['num_matching']), reverse=True)
    return skills, projects

@api_bp.route('/auth/register', methods=['POST'])
def api_register():
    value = data()
    if not value: return fail('A JSON request body is required.', 400)
    name, email, password, confirm = str(value.get('name','')).strip(), str(value.get('email','')).strip().lower(), value.get('password',''), value.get('confirm_password','')
    if not name or not email or not password or not confirm: return fail('Name, email, password, and confirm_password are required.', 400)
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email): return fail('Please enter a valid email address.', 400)
    if password != confirm or len(password) < 6: return fail('Passwords must match and be at least 6 characters long.', 400)
    con = cur = None
    try:
        con=get_db_connection(); cur=con.cursor(dictionary=True); cur.execute('SELECT id FROM users WHERE email=%s LIMIT 1',(email,))
        if cur.fetchone(): return fail('An account with this email already exists.',409)
        cur.execute('INSERT INTO users (name,email,password) VALUES (%s,%s,%s)',(name,email,generate_password_hash(password))); uid=cur.lastrowid; con.commit()
        return jsonify(user={'id':uid,'name':name,'email':email}),201
    except Error:
        if con: con.rollback()
        return fail('Unable to create account.',500)
    finally: finish(con,cur)

@api_bp.route('/auth/login', methods=['POST'])
def api_login():
    value=data()
    if not value: return fail('A JSON request body is required.',400)
    email,password=str(value.get('email','')).strip().lower(),value.get('password','')
    if not email or not password: return fail('Email and password are required.',400)
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);cur.execute('SELECT id,name,email,password,bio,github_url,created_at FROM users WHERE email=%s LIMIT 1',(email,)); user=cur.fetchone()
        if not user or not check_password_hash(user['password'],password): return fail('Invalid email or password.',401)
        session.update(user_id=user['id'],user_name=user['name'],user_email=user['email']); return jsonify(user=user_public(user))
    except Error: return fail('Unable to log in.',500)
    finally: finish(con,cur)

@api_bp.route('/auth/logout',methods=['POST'])
@protected
def api_logout():
    session.clear(); return jsonify(message='Logged out')

@api_bp.route('/auth/me')
@protected
def api_me():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True); user=get_user(cur,session['user_id'])
        if not user: session.clear(); return fail('User not found.',401)
        return jsonify(user=user_public(user))
    except Error: return fail('Unable to load current user.',500)
    finally: finish(con,cur)

@api_bp.route('/profile',methods=['GET','PATCH'])
@protected
def api_profile():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True)
        if request.method=='GET': return jsonify(user=user_public(get_user(cur,session['user_id'])))
        value=data()
        if not value: return fail('A JSON request body is required.',400)
        name=str(value.get('name','')).strip()
        if not name:return fail('Name cannot be empty.',400)
        bio,url=str(value.get('bio','')).strip(),str(value.get('github_url','')).strip()
        if url and not url.startswith(('http://','https://')): url='https://'+url
        cur.execute('UPDATE users SET name=%s,bio=%s,github_url=%s WHERE id=%s',(name,bio,url,session['user_id']));con.commit();session['user_name']=name
        return jsonify(user=user_public(get_user(cur,session['user_id'])))
    except Error:
        if con:con.rollback()
        return fail('Unable to update profile.',500)
    finally:finish(con,cur)

@api_bp.route('/skills')
@protected
def api_skills():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);cur.execute('SELECT id,skill_name FROM skills ORDER BY skill_name');return jsonify(skills=cur.fetchall())
    except Error:return fail('Unable to load skills.',500)
    finally:finish(con,cur)

@api_bp.route('/profile/skills',methods=['GET','POST'])
@protected
def api_profile_skills():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);uid=session['user_id']
        if request.method=='GET':return jsonify(skills=user_skills(cur,uid))
        value=data()
        if not value:return fail('A JSON request body is required.',400)
        skill_id=value.get('skill_id'); custom=str(value.get('custom_skill','')).strip()
        if skill_id is not None:
            try:skill_id=int(skill_id)
            except (TypeError,ValueError):return fail('skill_id must be a number.',400)
            cur.execute('SELECT id FROM skills WHERE id=%s LIMIT 1',(skill_id,))
            if not cur.fetchone():return fail('Skill not found.',404)
        elif custom:
            cur.execute('SELECT id FROM skills WHERE LOWER(skill_name)=LOWER(%s) LIMIT 1',(custom,)); found=cur.fetchone()
            if found:skill_id=found['id']
            else:cur.execute('INSERT INTO skills (skill_name) VALUES (%s)',(custom,));skill_id=cur.lastrowid
        else:return fail('skill_id or custom_skill is required.',400)
        cur.execute('SELECT 1 FROM user_skills WHERE user_id=%s AND skill_id=%s LIMIT 1',(uid,skill_id))
        if cur.fetchone():
            con.rollback();return fail('This skill is already in your profile.',409)
        cur.execute('INSERT INTO user_skills (user_id,skill_id) VALUES (%s,%s)',(uid,skill_id));con.commit();return jsonify(skills=user_skills(cur,uid)),201
    except Error:
        if con:con.rollback()
        return fail('Unable to add skill.',500)
    finally:finish(con,cur)

@api_bp.route('/profile/skills/<int:skill_id>',methods=['DELETE'])
@protected
def api_remove_skill(skill_id):
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);cur.execute('DELETE FROM user_skills WHERE user_id=%s AND skill_id=%s',(session['user_id'],skill_id))
        if not cur.rowcount:return fail('Skill is not in your profile.',404)
        con.commit();return jsonify(message='Skill removed',skills=user_skills(cur,session['user_id']))
    except Error:
        if con:con.rollback()
        return fail('Unable to remove skill.',500)
    finally:finish(con,cur)

@api_bp.route('/projects',methods=['GET','POST'])
@protected
def api_projects():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);uid=session['user_id']
        if request.method=='GET':
            cur.execute('SELECT id FROM projects ORDER BY created_at DESC');return jsonify(projects=[project(cur,row['id'],uid) for row in cur.fetchall()])
        value=data();payload,message=project_payload(value or {})
        if message:return fail(message,400)
        title,description,size,skill_ids=payload
        if not validate_skills(cur,skill_ids):return fail('One or more skills were not found.',404)
        cur.execute('INSERT INTO projects (title,description,owner_id,team_size) VALUES (%s,%s,%s,%s)',(title,description,uid,size));pid=cur.lastrowid
        for skill_id in skill_ids:cur.execute('INSERT INTO project_skills (project_id,skill_id) VALUES (%s,%s)',(pid,skill_id))
        con.commit();return jsonify(project=project(cur,pid,uid)),201
    except Error:
        if con:con.rollback()
        return fail('Unable to save project.',500)
    finally:finish(con,cur)

@api_bp.route('/projects/<int:project_id>',methods=['GET','PATCH','DELETE'])
@protected
def api_project(project_id):
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);uid=session['user_id'];item=project(cur,project_id,uid)
        if not item:return fail('Project not found.',404)
        if request.method=='GET':return jsonify(project=item)
        if item['owner_id']!=uid:return fail('Only the project creator can modify this project.',403)
        if request.method=='DELETE':
            cur.execute('DELETE FROM project_skills WHERE project_id=%s',(project_id,));cur.execute('DELETE FROM projects WHERE id=%s',(project_id,));con.commit();return jsonify(message='Project deleted')
        value=data();payload,message=project_payload(value or {})
        if message:return fail(message,400)
        title,description,size,skill_ids=payload
        if member_count(cur,project_id)>size:return fail('Team size cannot be smaller than the current team.',409)
        if not validate_skills(cur,skill_ids):return fail('One or more skills were not found.',404)
        cur.execute('UPDATE projects SET title=%s,description=%s,team_size=%s WHERE id=%s',(title,description,size,project_id));cur.execute('DELETE FROM project_skills WHERE project_id=%s',(project_id,))
        for skill_id in skill_ids:cur.execute('INSERT INTO project_skills (project_id,skill_id) VALUES (%s,%s)',(project_id,skill_id))
        con.commit();return jsonify(project=project(cur,project_id,uid))
    except Error:
        if con:con.rollback()
        return fail('Unable to update project.',500)
    finally:finish(con,cur)

@api_bp.route('/matches')
@protected
def api_matches():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);skills,projects=match_results(cur,session['user_id']);return jsonify(user_skills=skills,projects=projects)
    except Error:return fail('Unable to calculate matches.',500)
    finally:finish(con,cur)

@api_bp.route('/team-requests')
@protected
def api_team_requests():
    con=cur=None
    try:
        con=get_db_connection();cur=con.cursor(dictionary=True);uid=session['user_id']
        cur.execute('SELECT tr.id,tr.project_id,tr.status,tr.created_at,p.title AS project_title FROM team_requests tr JOIN projects p ON p.id=tr.project_id WHERE tr.sender_id=%s ORDER BY tr.created_at DESC',(uid,));sent=cur.fetchall()
        cur.execute("""SELECT tr.id,tr.project_id,tr.status,tr.created_at,p.title AS project_title,u.name AS requester_name,u.email AS requester_email,p.team_size
            FROM team_requests tr JOIN projects p ON p.id=tr.project_id JOIN users u ON u.id=tr.sender_id WHERE p.owner_id=%s ORDER BY tr.status='pending' DESC,tr.created_at DESC""",(uid,));incoming=cur.fetchall()
        for item in incoming:item['current_team_count']=member_count(cur,item['project_id'])
        return jsonify(sent=sent,incoming=incoming)
    except Error:return fail('Unable to load team requests.',500)
    finally:finish(con,cur)

@api_bp.route('/projects/<int:project_id>/requests',methods=['POST'])
@protected
def api_create_request(project_id):
    con=cur=None
    try:
        con=get_db_connection();con.start_transaction();cur=con.cursor(dictionary=True);uid=session['user_id']
        cur.execute('SELECT id,owner_id,team_size,title FROM projects WHERE id=%s FOR UPDATE',(project_id,));item=cur.fetchone()
        if not item:return fail('Project not found.',404)
        if item['owner_id']==uid:return fail('You cannot request to join your own project.',403)
        cur.execute('SELECT 1 FROM project_members WHERE project_id=%s AND user_id=%s LIMIT 1',(project_id,uid))
        if cur.fetchone():return fail('You are already a member of this project.',409)
        if member_count(cur,project_id)>=item['team_size']:return fail('This project team is full.',409)
        cur.execute("SELECT id FROM team_requests WHERE project_id=%s AND sender_id=%s AND status='pending' LIMIT 1",(project_id,uid))
        if cur.fetchone():return fail('You already have a pending request for this project.',409)
        cur.execute("INSERT INTO team_requests (project_id,sender_id,receiver_id,status) VALUES (%s,%s,%s,'pending')",(project_id,uid,item['owner_id']));rid=cur.lastrowid;con.commit()
        return jsonify(request={'id':rid,'project_id':project_id,'status':'pending'}),201
    except Error:
        if con:con.rollback()
        return fail('Unable to send team request.',500)
    finally:finish(con,cur)

def answer_request(request_id, action):
    con=cur=None
    try:
        con=get_db_connection();con.start_transaction();cur=con.cursor(dictionary=True)
        cur.execute('SELECT tr.id,tr.project_id,tr.sender_id,tr.status,p.owner_id,p.team_size FROM team_requests tr JOIN projects p ON p.id=tr.project_id WHERE tr.id=%s FOR UPDATE',(request_id,));item=cur.fetchone()
        if not item:return fail('Team request not found.',404)
        if item['owner_id']!=session['user_id']:return fail('Only the project creator can respond to this request.',403)
        if item['status']!='pending':return fail('This request has already been processed.',409)
        if action=='reject':cur.execute("UPDATE team_requests SET status='rejected' WHERE id=%s",(request_id,));con.commit();return jsonify(request={'id':request_id,'status':'rejected'})
        cur.execute('SELECT id FROM projects WHERE id=%s FOR UPDATE',(item['project_id'],));cur.fetchone()
        if member_count(cur,item['project_id'])>=item['team_size']:return fail('The team is full; this request remains pending.',409)
        cur.execute('SELECT 1 FROM project_members WHERE project_id=%s AND user_id=%s LIMIT 1',(item['project_id'],item['sender_id']))
        if cur.fetchone():return fail('This student is already a project member.',409)
        cur.execute('INSERT INTO project_members (project_id,user_id) VALUES (%s,%s)',(item['project_id'],item['sender_id']));cur.execute("UPDATE team_requests SET status='accepted' WHERE id=%s",(request_id,));con.commit()
        return jsonify(request={'id':request_id,'status':'accepted'},member={'project_id':item['project_id'],'user_id':item['sender_id']})
    except Error:
        if con:con.rollback()
        return fail('Unable to process team request.',500)
    finally:finish(con,cur)

@api_bp.route('/team-requests/<int:request_id>/accept',methods=['POST'])
@protected
def api_accept_request(request_id): return answer_request(request_id,'accept')
@api_bp.route('/team-requests/<int:request_id>/reject',methods=['POST'])
@protected
def api_reject_request(request_id): return answer_request(request_id,'reject')
