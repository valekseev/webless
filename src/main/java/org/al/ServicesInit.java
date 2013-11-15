package org.al;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

@WebListener
public class ServicesInit implements ServletContextListener {

	@Override
	public void contextInitialized(ServletContextEvent event) {
        System.out.println("Starting spamming");
		SpammerService.getInstance().start();
    }
	
	@Override
    public void contextDestroyed(ServletContextEvent event) {
    	SpammerService.getInstance().shutdown();
        System.out.println("Stopped spamming");
    }

}