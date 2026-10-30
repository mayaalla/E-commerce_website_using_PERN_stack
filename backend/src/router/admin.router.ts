import { Router } from "express";
import app from "../app.js";


const router = Router();

// create admin
app.post("/", (req, res) => {})

// get admin
app.get("/:id", (req, res) => {})

// get all admins
app.get("/", (req, res) => {})

// update admin
app.put("/:id", (req, res) => {})

// delete admin
app.delete("/:id", (req, res) => {})