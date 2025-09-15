import { Button, Form } from "react-bootstrap";
import {FaHandHoldingHeart } from "react-icons/fa";
const AuthForm = ({ title, fields, onSubmit, buttonText, googleBtn }) => {
  return (
    <div className="d-flex vh-100">
      <div className="w-50 d-flex flex-column justify-content-center align-items-center bg-primary text-white p-5">
        <h1>Hello Team HLG! <FaHandHoldingHeart/></h1>
        <p>
          Skip repetitive and manual sales-marketing tasks. Get highly
          productive through automation and save tons of time!
        </p>
      </div>

      <div className="w-50 d-flex flex-column justify-content-center align-items-center">
        <h3 className="mb-4">{title}</h3>
        <Form className="w-75" onSubmit={onSubmit}>
          {fields}
          <Button type="submit" className="w-100 mb-3 mt-2" variant="dark">
            {buttonText}
          </Button>
          {googleBtn}
        </Form>
      </div>
    </div>
  );
};

export default AuthForm;
