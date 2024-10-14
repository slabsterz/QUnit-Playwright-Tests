QUnit.config.reorder = false;

let userData = {
    "email": "",
    "password": "123123"
}

let bookExample = {
    "title": "",
    "description": "",
    "imageUrl": "/images/2.png",
    "type": "Other"
}

const baseUrl = "http://localhost:3030";

function generateRandom() {
    return Math.floor(Math.random() * 10000);
}

let token = "";
let userId = "";
let createdBookId = "";

QUnit.module("user functionality tests", function() {

    QUnit.test("user registration", async function(assert) {
        let path = "/users/register";
        userData.email = `email-${generateRandom()}@email.com`;

        let request = await fetch(baseUrl + path, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        assert.ok(request.ok, "request success");

        let response = await request.json();
        assert.strictEqual(typeof response, "object", "response is an object");

        assert.ok(response.hasOwnProperty("accessToken"), "response has accessToken property");
        assert.strictEqual(typeof response.accessToken, "string", "property is a string");
        assert.ok(response.accessToken.length > 0, "token is not empty");

        assert.ok(response.hasOwnProperty("email"), "has email property");
        assert.equal(response.email, userData.email, "emails match");
        assert.strictEqual(typeof response.email, "string", "response is a string");

        assert.ok(response._createdOn, "number", "createdOn property is a number");

        token = response.accessToken;
        userId = response._id;

        sessionStorage.setItem("book-user", JSON.stringify(userData));
    });

    QUnit.test("user login with valid data", async function(assert) {
        let path = "/users/login";

        let request = await fetch(baseUrl + path, {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        assert.ok(request.ok, "request success");

        let response = await request.json();      
        

        assert.ok(response.hasOwnProperty("accessToken"), "response has accessToken property");
        assert.ok(response.accessToken, "string", "accessToken property is a string");

        if(response.accessToken != token) {
            token = response.accessToken;
        }

        assert.equal(response._id, userId, "id match");

        //copy this
        assert.ok(response.hasOwnProperty("email"), "response has email property");
        assert.strictEqual(typeof response.email, "string", "response is a string");
        assert.ok(response.email.length > 0, "email property is not empty");
        assert.equal(response.email, userData.email, "respose email property match create user email property");

        sessionStorage.setItem("book-user", JSON.stringify(userData));
    });
});

QUnit.module("book functionality tests", function() {

    QUnit.test("create a book", async function(assert) {
        let path = "/data/books";

        bookExample.title = `Random-Title-${generateRandom()}`;
        bookExample.description = `Random-Description-${generateRandom()}`;

        let request = await fetch(baseUrl + path, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "X-Authorization": token
            },
            body: JSON.stringify(bookExample)
        });

        assert.ok(request.ok, "request success");

        let response = await request.json();

        assert.strictEqual(typeof response, "object", "response is an object");
        assert.ok(response.hasOwnProperty("_id"), "response has id property");

        assert.equal(response._ownerId, userId, "user id match");

        createdBookId = response._id;
    });

    QUnit.test("edit created book", async function(assert) {
        let path = `/data/books/${createdBookId}`;

        bookExample.title += " EDITED";

        let request = await fetch(baseUrl + path, {
            method: "PUT",
            headers: {
                "content-type": "application/json",
                "X-Authorization": token
            },
            body: JSON.stringify(bookExample)
        });

        assert.ok(request.ok, "request success");

        let response = await request.json();
        console.log(response);

        assert.ok(response.title.includes("EDITED"), "response contains EDITED");

        assert.equal(response._ownerId, userId, "created user and edited book user id match");
        assert.equal(response._id, createdBookId, "response book id and created book id match");

    });

    QUnit.test("delete created book", async function(assert) {
        let path = `/data/books/${createdBookId}`;

        let request = await fetch(baseUrl + path, {
            method: "DELETE",
            headers: {
                "X-Authorization": token
            }
        });

        assert.ok(request.ok, "request success");
    });
});