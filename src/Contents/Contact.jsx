import React from 'react';
import { FacebookIcon, InstagramIcon, GmailIcon, GithubIcon, LinkedinIcon } from './Icons';

function Contact(props) {
    return (
        <div>
          <div className="box">
             <a 
              className="button" 
              href="#popup1">
              Let's Talk
             </a>
          </div>
          <div id="popup1" className="overlay">
           <div className="popup">
             <h4>Let's Talk</h4>
             <a className="close" href="/#">&times;</a>
          <div className=" text-center pt-2">
             <p className="badge text-white">
             <span role="img" aria-label="">📞</span>
             +91 74669 14279
             </p>
             <p className="badge text-danger">
             <GmailIcon/>  anadithakur99@gmail.com</p>
          <div>
             <a className="mx-2" href="https://www.facebook.com/anadi.thakur.3"><FacebookIcon/></a>
             <a className="mx-2" href="https://www.instagram.com/anadi_thakur_9"><InstagramIcon/></a>
             <a className="mx-2" href="https://github.com/Anadi9"><GithubIcon/></a>
             <a className="mx-2" href="https://www.linkedin.com/in/anadi-thakur-92163316b"><LinkedinIcon/></a>
          </div>
          </div>
          </div>
          </div>
        </div>
    );
}

export default Contact;