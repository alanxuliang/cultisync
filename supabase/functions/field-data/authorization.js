export async function authorizeField(admin, authorization, fieldId) {
  if (!authorization.startsWith('Bearer ')) return {status:401,error:'Sign in required'};
  const {data:{user},error} = await admin.auth.getUser(authorization.slice(7));
  if (error || !user) return {status:401,error:'Session expired. Sign in again.'};
  if (typeof fieldId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fieldId)) return {status:400,error:'Invalid field'};
  const {data:field,error:fieldError} = await admin.from('fields').select('*').eq('id',fieldId).eq('owner_id',user.id).maybeSingle();
  if (fieldError) throw new Error('Database unavailable');
  if (!field) return {status:404,error:'Field not found'};
  return {field};
}
