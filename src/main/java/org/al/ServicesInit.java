package org.al;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@WebListener
public class ServicesInit implements ServletContextListener {
    private static final Logger logger = LoggerFactory.getLogger(ServletContextListener.class);


	@Override
	public void contextInitialized(ServletContextEvent event) {
	    logger.info("Starting spammer");
		SpammerService.getInstance().start();
    }
	
	@Override
    public void contextDestroyed(ServletContextEvent event) {
	    logger.info("Stopping spammer");
    	SpammerService.getInstance().shutdown();
    }

}