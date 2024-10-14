const { test, describe, beforeEach, afterEach, beforeAll, afterAll, expect } = require('@playwright/test');
const { chromium } = require('playwright');

const host = 'http://localhost:3001'; // Application host (NOT service host - that can be anything)

let browser;
let context;
let page;

let user = {
    email : "",
    password : "123456",
    confirmPass : "123456",
};

let exampleBook = {
    title: "",
    description: "",
    image: "/random-image",
    type: ""
}

let token = "";
let userId = "";
let createdBookId = "";

function generateRandom() {
    return Math.floor(Math.random() * 10000);
}

describe("e2e tests", () => {
    beforeAll(async () => {
        browser = await chromium.launch();
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
    });

    afterEach(async () => {
        await page.close();
        await context.close();
    });

    
    describe("authentication", () => {

        test("registration with valid data", async function() {
            user.email = `email-${generateRandom()}@email.com`

            await page.goto(host);
            await page.locator("a[href='/register']").click();
            await page.waitForSelector("form");
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.locator("#repeat-pass").fill(user.confirmPass);

            let [response] = await Promise.all([
                page.waitForResponse(x => x.url().includes("/users/register") && x.status() === 200),
                page.locator(".button.submit").click()
            ]);

            expect(response.ok()).toBeTruthy();

            let json = await response.json();            

            expect(json.email).toBe(user.email);
            expect(json.password).toEqual(user.password);

            token = json.accessToken;
            userId = json._id;

        });

        test("login with valid data", async function() {
            await page.goto(host);
            await page.locator("a[href='/login']").click();
            await page.waitForSelector("form");
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);

            let [response] = await Promise.all([
                page.waitForResponse(x => x.url().includes("/users/login") && x.status() === 200),
                page.locator(".button.submit").click()
            ]);

            expect(response.ok()).toBeTruthy();

            let json = await response.json();

            expect(json.email).toBe(user.email);
            expect(json.password).toEqual(user.password);

            if(token != json.accessToken) {
                token = json.accessToken;
            }

            expect(json._id).toBe(userId);
        });

        test("user logout", async function() {
            await page.goto(host);
            await page.locator("a[href='/login']").click();
            await page.waitForSelector("form");
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.locator(".button.submit").click();

            let [response] = await Promise.all([
                page.waitForResponse(x => x.url().includes("/users/logout") && x.status() === 204),
                page.locator("a[href='/logout']").click()
            ]);

            expect(response.ok()).toBeTruthy();
            await page.waitForSelector("a[href='/login']");
            expect(page.url()).toBe(`${host}/`);
        });
    })

    describe("navbar", () => {

        test("navigation for logged-in users", async function() {
            await page.goto(host);
            await page.locator("a[href='/login']").click();
            await page.waitForSelector("form");
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.locator(".button.submit").click();

            await expect(page.locator("a[href='/']")).toBeVisible();
            await expect(page.locator("a[href='/mybooks']")).toBeVisible();
            await expect(page.locator("a[href='/create']")).toBeVisible();
            await expect(page.locator("a[href='/logout']")).toBeVisible();

            await expect(page.locator("a[href='/login']")).toBeHidden();
            await expect(page.locator("a[href='/register']")).toBeHidden();

        });

        test("navigation for not logged-in users", async function() {
            await page.goto(host);            

            await expect(page.locator("a[href='/']")).toBeVisible();
            await expect(page.locator("a[href='/mybooks']")).toBeHidden();
            await expect(page.locator("a[href='/create']")).toBeHidden();
            await expect(page.locator("a[href='/logout']")).toBeHidden();

            await expect(page.locator("a[href='/login']")).toBeVisible();
            await expect(page.locator("a[href='/register']")).toBeVisible();

        });
    });

    describe("CRUD", () => {
        beforeEach(async function() {
            await page.goto(host);
            await page.locator("a[href='/login']").click();
            await page.waitForSelector("form");
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.locator(".button.submit").click();
        });
        
        test("create a book functionality", async function() {
            exampleBook.title = `Test title-${generateRandom()}`;
            exampleBook.description = `Random test description-${generateRandom()}`;

            await page.locator("a[href='/create']").click();
            await page.waitForSelector("form");
            await page.locator(".input #title").fill(exampleBook.title);
            await page.locator(".input #description").fill(exampleBook.description);
            await page.locator(".input #image").fill(exampleBook.image);
            await page.locator("select[id='type']").selectOption("Classic");

            let [response] = await Promise.all([
                page.waitForResponse(x => x.url().includes("/data/books") && x.status()  === 200),
                page.locator(".button.submit").click()
            ]);

            expect(response.ok()).toBeTruthy();
            
            let json = await response.json();

            expect(json._ownerId).toEqual(userId);
            expect(json.title).toBe(exampleBook.title);
            expect(json.description).toBe(exampleBook.description);
            expect(json.imageUrl).toBe(exampleBook.image);
            expect(json.type).toEqual("Classic");
            expect(json._id.length).toBeGreaterThan(0);

            createdBookId = json._id;
        });

        test("edit created book", async function() {
            let updateTitle = `${exampleBook.title} + UPDATED`;
            
            await page.locator("a[href='/mybooks']").click();
            await page.locator("text=Details").first().click();
            await page.locator("text=Edit").click();
            await page.waitForSelector("form");
            await page.locator("#title").fill(updateTitle);

            let [response] = await Promise.all([
                page.waitForResponse(x => x.url().includes("/data/books") && x.status() === 200),
                page.locator(".button.submit").click()
            ]);

            expect(response.ok()).toBeTruthy();

            let json = await response.json();

            expect(json.title).toContain("UPDATED");
            expect(json.description).toBe(exampleBook.description);
            expect(json.imageUrl).toBe(exampleBook.image);
            expect(json.type).toEqual("Fiction");
        });

        test("delete a book", async function() {
            await page.locator("a[href='/mybooks']").click();
            await page.locator("text=Details").first().click();

            let [response] = await Promise.all([
                page.waitForResponse(x => x.url().includes("/data/books") && x.status() === 200),
                page.locator("text=Delete").click()
            ]);

            expect(response.ok()).toBeTruthy();
        });
    })
})