package org.al;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;

@WebListener
public class DaemonInit implements ServletContextListener {
	private ExecutorService executor;

    public void contextInitialized(ServletContextEvent event) {
        executor = Executors.newSingleThreadExecutor();
        System.out.println("Starting spamming");
		executor.submit(SpammerSingleton.getInstance());
    }

    public void contextDestroyed(ServletContextEvent event) {
        executor.shutdown();
        System.out.println("Stopped spamming");
    }

}