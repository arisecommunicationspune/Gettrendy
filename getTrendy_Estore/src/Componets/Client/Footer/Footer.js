import "../../../../src/App.css"
import React, { useState } from "react";
import {
  MDBFooter,
  MDBContainer,
  MDBRow,
  MDBCol,
  
} from "mdb-react-ui-kit";
import {
  FaFacebook,
  FaGoogle,
  FaInstagram,
} from "react-icons/fa";
import { FaLinkedinIn, FaLocationPinLock } from "react-icons/fa6";
import { BsFillTelephoneInboundFill } from "react-icons/bs";
import { useAuth } from "../../AuthContext/AuthContext";

const Footer = () => {
  const { userToken } = useAuth();

  return (
    <>
      <MDBFooter bgColor="light" className="text-center text-lg-start ">
        <section
          className=""
          style={{ backgroundColor: "white", color: "black" }}
        >
          <MDBContainer className="text-center text-md-start  py-4">
            <MDBRow className="mt-3">
              <MDBCol md="12" lg="12" xl="7" className="mx-auto  text-center">
                <img
                  src="/Images/logo.jpg"
                  alt="logo"
                  style={{
                    width: "200px",
                    objectFit: "contain",
                  }}
                />
                <p className="text-black">
                  fast, fresh, and affordable. From bold streetwear to everyday essentials, our collections are designed to keep you on-trend without breaking the bank. We believe fashion should be fun, fearless, and for everyone.
                </p>
              </MDBCol>

            </MDBRow>
          </MDBContainer>
        </section>

        <section
          className="d-flex justify-content-center pb-5  border-bottom"
          style={{ backgroundColor: "white",  }}
        >
          <div>
            <a
              href="https://www.facebook.com/share/1AVHHdahw2/?mibextid=wwXIfr"
              className="me-4 text-reset"
            >
              <FaFacebook size={25} />
            </a>

            <a
              href="https://www.instagram.com/gettrendybrand?igsh=MnF5bDA1emdzcjhh&utm_source=qr"
              className="me-4 text-reset"
            >
              <FaInstagram fab icon="instagram" size={25} />
            </a>
            <a
              href="https://www.linkedin.com/company/get-trendy-pune/about/?viewAsMember=true"
              className="me-4 text-reset"
            >
              <FaLinkedinIn fab icon="linkedin" size={25} />
            </a>
            <a href="https://g.co/kgs/u5jnWfa" className=" text-reset">
              <FaGoogle size={25} />
            </a>
          </div>
        </section>

         <section
          className="lg-d-flex justify-content-center align-items-baseline space-between  border-top border-bottom"
          style={{  }}
        >
          
                <h6 className="text-uppercase fw-bold m-4">Useful links</h6>

                <p>
                  <a href="/privacyPolicy" className="m-4 text-black">
                    Privacy Policy
                  </a>
                </p>
                <p >
                  <a href="/termsconditions" className="m-4 text-black">
                    Terms & Conditions
                  </a>
                </p>
                <p>
                  <a href="/cancellation-Reschedule" className="m-4 text-black">
                    Cancellation & Reschedule Policy
                  </a>
                </p>
                <p>
                  <a href="/contact" className="m-4 text-black">
                    Contact Us
                  </a>
                </p>
              
        </section>
        
        <div
          className="text-center p-4"
          style={{ backgroundColor: "black", color: "white" }}>
          © {new Date().getFullYear()} All Rights Reserved Get Trendy &nbsp; | &nbsp; Design & Developed by 
          <a className="text-reset fw-bold " href="https://arisecommunications.co/"> Arise Communications.</a>
            
           {/* <p className="float-end mb-0">Version : {process.env.REACT_APP_VERSION}</p> */}
        </div>
      </MDBFooter>
    </>
  );
};

export default Footer;