import { v4 as uuidv4 } from "uuid";
import AWS from "aws-sdk";
const { CognitoIdentityServiceProvider, DynamoDB } = AWS;
const cognito = new AWS.CognitoIdentityServiceProvider({
                    region: process.env.REGION
                });
const dynamoDb = new DynamoDB.DocumentClient();
const TABLES_TABLE = process.env.TABLES_TABLE;
const RESERVATIONS_TABLE = process.env.RESERVATIONS_TABLE;
const USER_POOL_ID = process.env.cup_id;
const COGNITO_CLIENT_ID  = process.env.cup_client_id;

/**
 * Signup Handler
 */
export const signup = async (event) => {
  try {
    const { firstName, lastName, email, password } = JSON.parse(event.body);

    // Input validation
    if (!firstName || !lastName || !email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "All fields are required." }) };
    }

    if (!/^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid email format." }) };
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[$%^*-_])[A-Za-z\d$%^*-_]{12,}$/.test(password)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid password format." }) };
    }

    // Create Cognito user
    await cognito.adminCreateUser({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
        { Name: "email", Value: email }
      ],
      TemporaryPassword: password,
      MessageAction: "SUPPRESS", // Prevents email sending
    }).promise();

    return { statusCode: 200, body: JSON.stringify({ message: "User created successfully." }) };

  } catch (error) {
    console.error("Signup error:", error);
    return { statusCode: 502, body: JSON.stringify({ error: "Signup failed." }) };
  }
};

/**
 * Signin Handler
 */
export const signin = async (event) => {
    try {
        const { email, password } = JSON.parse(event.body);
        const params = {
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
                    UserPoolId: USER_POOL_ID,
                    ClientId:COGNITO_CLIENT_ID,
                    AuthParameters: {
                        USERNAME: email,
                        PASSWORD: password
                    }
        };
        const data = await cognito.adminInitiateAuth(params).promise();
                const idToken = data.AuthenticationResult.IdToken;
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken: idToken })
                };
    } catch (error) {
              console.error(error);
              return {
                  statusCode: 500,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ error: "Authentication failed", details: error.message })
              };
          }
};

/**
 * Get Tables Handler
 */
export const getTables = async () => {
  try {
    const data = await dynamoDb.scan({ TableName: TABLES_TABLE }).promise();
    return { statusCode: 200, body: JSON.stringify({ tables: data.Items }) };
  } catch (error) {
    console.error("GetTables error:", error);
    return { statusCode: 400, body: JSON.stringify({ error: "Failed to get tables." }) };
  }
};

/**
 * Add Table Handler
 */
export const addTable = async (event) => {
  try {
    const table = JSON.parse(event.body);
    await dynamoDb.put({ TableName: TABLES_TABLE, Item: table }).promise();
    return { statusCode: 200, body: JSON.stringify({ id: table.id }) };
  } catch (error) {
    console.error("AddTable error:", error);
    return { statusCode: 400, body: JSON.stringify({ error: "Failed to add table." }) };
  }
};

/**
 * Get Reservations Handler
 */
export const getReservations = async () => {
  try {
    const data = await dynamoDb.scan({ TableName: RESERVATIONS_TABLE }).promise();
    return { statusCode: 200, body: JSON.stringify({ reservations: data.Items }) };
  } catch (error) {
    console.error("GetReservations error:", error);
    return { statusCode: 400, body: JSON.stringify({ error: "Failed to get reservations." }) };
  }
};

/**
 * Add Reservation Handler
 */
export const addReservation = async (event) => {
  try {
    const reservation = JSON.parse(event.body);
    reservation.reservationId = uuidv4();

    await dynamoDb.put({ TableName: RESERVATIONS_TABLE, Item: reservation }).promise();
    return { statusCode: 200, body: JSON.stringify({ reservationId: reservation.reservationId }) };
  } catch (error) {
    console.error("AddReservation error:", error);
    return { statusCode: 400, body: JSON.stringify({ error: "Failed to add reservation." }) };
  }
};