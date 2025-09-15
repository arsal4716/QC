// src/components/InputField.js
import React from "react";
import { Form } from "react-bootstrap";
import { IconContext } from "react-icons";

const InputField = ({ label, type, placeholder, value, onChange, icon }) => {
  return (
    <Form.Group className="mb-3">
      {label && <Form.Label>{label}</Form.Label>}
      <div className="d-flex align-items-center border rounded px-2">
        <IconContext.Provider value={{ size: "1.2em", className: "me-2" }}>
          {icon}
        </IconContext.Provider>
        <Form.Control
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="border-0 shadow-none"
        />
      </div>
    </Form.Group>
  );
};

export default InputField;
