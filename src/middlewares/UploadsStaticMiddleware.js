import express from "express";

const uploadsStatic = (storage) =>
  express.static(storage.baseDir, {
    index: false,
    dotfiles: "deny",
    maxAge: "7d",
    setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin"),
  });

export default uploadsStatic;
