

// verify that the admin is authorized to perform the action get the id  from req.id

// the input of this middleware will be permision that is string
// if it is super admin, allow the action
// if the admin has permission "full_access", allow the action
// if the admin has permission that is equal to the input permission, allow the action

// if the admin is not authorized, return an error to the client
// call next() to pass the control to the next middleware or route handler
