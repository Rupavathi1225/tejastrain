const Footer = () => {
  return (
    <footer className="bg-muted mt-16 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-primary mb-4">Data Credit Zone</h3>
            <p className="text-muted-foreground">
              Thank you for visiting Data Credit Zone, your digital hub for embracing a vibrant and wholesome lifestyle. 
              At Data Credit Zone, we're dedicated to inspiring and guiding you on the path to optimal well-being, 
              offering a treasure trove of content that covers a spectrum of healthy lifestyle topics.
            </p>
          </div>
          
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All content provided on this page is carefully researched, written, and reviewed to maintain a high level 
              of accuracy and reliability. While every effort is made to ensure the information is current and useful, 
              it is shared for general educational and informational purposes only. The material on this page should not 
              be interpreted as professional advice, diagnosis, or treatment in any area, including financial, medical, 
              or legal matters. Readers are strongly advised to verify information independently and consult qualified 
              professionals before making any personal, financial, health, or legal decisions based on the content 
              presented here.
            </p>
          </div>
          
          <div className="mt-8 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Data Credit Zone. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;